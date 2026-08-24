# postprocess.mojo — YOLOv8-seg decode + class-aware NMS, exported over the C ABI.
#
# Why this kernel and not the whole model: ONNX Runtime already dispatches the
# convolutional graph to tuned oneDNN/BLAS kernels. The part that stays in slow
# interpreted-Python-adjacent code is the 8400x(4+nc+32) decode and the O(k^2)
# IoU loop. That is what this file replaces.
#
# Memory layout matches ONNX Runtime's output0 exactly, no transpose on the
# Python side: preds is (n_attrs, n_preds) row-major, so all n_preds values of a
# single attribute are contiguous. That lets the class-score reduction vectorise
# across predictions instead of across classes.
#
# Build:
#   pixi run mojo build --emit shared-lib backend/mojo/postprocess.mojo \
#       -o backend/mojo/build/libnvpost.so
#
# Verify the exported symbol before wiring it up:
#   nm -D backend/mojo/build/libnvpost.so | grep nv_decode_nms

from memory import UnsafePointer
from sys.info import simdwidthof

alias F32 = DType.float32
alias SIMD_W = simdwidthof[F32]()

alias ERR_BAD_SHAPE: Int32 = -1
alias ERR_NO_CLASSES: Int32 = -2


@always_inline
fn _iou(
    ax1: Float32, ay1: Float32, ax2: Float32, ay2: Float32,
    bx1: Float32, by1: Float32, bx2: Float32, by2: Float32,
) -> Float32:
    var ix1 = max(ax1, bx1)
    var iy1 = max(ay1, by1)
    var ix2 = min(ax2, bx2)
    var iy2 = min(ay2, by2)
    var iw = max(Float32(0.0), ix2 - ix1)
    var ih = max(Float32(0.0), iy2 - iy1)
    var inter = iw * ih
    var area_a = (ax2 - ax1) * (ay2 - ay1)
    var area_b = (bx2 - bx1) * (by2 - by1)
    var union = area_a + area_b - inter
    if union <= 0.0:
        return 0.0
    return inter / union


@export
fn nv_decode_nms(
    preds: UnsafePointer[Float32],
    n_preds: Int32,
    n_attrs: Int32,
    n_cls: Int32,
    conf: Float32,
    iou_thres: Float32,
    max_det: Int32,
    out_boxes: UnsafePointer[Float32],
    out_scores: UnsafePointer[Float32],
    out_cls: UnsafePointer[Int32],
    out_idx: UnsafePointer[Int32],
) -> Int32:
    var np_ = Int(n_preds)
    var nc = Int(n_cls)
    var nd = Int(max_det)

    if np_ <= 0 or Int(n_attrs) < 4 + nc:
        return ERR_BAD_SHAPE
    if nc <= 0:
        return ERR_NO_CLASSES

    # ---- Pass 1: best class score per prediction, vectorised over predictions ----
    var best = UnsafePointer[Float32].alloc(np_)
    var best_cls = UnsafePointer[Int32].alloc(np_)

    var vec_end = (np_ // SIMD_W) * SIMD_W
    var p = 0
    while p < vec_end:
        var acc = SIMD[F32, SIMD_W](-1.0e30)
        var acc_cls = SIMD[DType.int32, SIMD_W](0)
        for c in range(nc):
            var row = preds + (4 + c) * np_
            var v = row.load[width=SIMD_W](p)
            var m = v > acc
            acc = m.select(v, acc)
            acc_cls = m.select(SIMD[DType.int32, SIMD_W](Int32(c)), acc_cls)
        best.store[width=SIMD_W](p, acc)
        best_cls.store[width=SIMD_W](p, acc_cls)
        p += SIMD_W

    while p < np_:                                   # scalar tail
        var m_score = Float32(-1.0e30)
        var m_cls = Int32(0)
        for c in range(nc):
            var v = (preds + (4 + c) * np_)[p]
            if v > m_score:
                m_score = v
                m_cls = Int32(c)
        best[p] = m_score
        best_cls[p] = m_cls
        p += 1

    # ---- Pass 2: confidence filter + xywh -> xyxy ----
    var cand_idx = UnsafePointer[Int32].alloc(np_)
    var cand_box = UnsafePointer[Float32].alloc(np_ * 4)
    var n_cand = 0

    var row_x = preds
    var row_y = preds + np_
    var row_w = preds + 2 * np_
    var row_h = preds + 3 * np_

    for i in range(np_):
        if best[i] <= conf:
            continue
        var cx = row_x[i]
        var cy = row_y[i]
        var hw = row_w[i] * 0.5
        var hh = row_h[i] * 0.5
        cand_box[n_cand * 4 + 0] = cx - hw
        cand_box[n_cand * 4 + 1] = cy - hh
        cand_box[n_cand * 4 + 2] = cx + hw
        cand_box[n_cand * 4 + 3] = cy + hh
        cand_idx[n_cand] = Int32(i)
        n_cand += 1

    # ---- Pass 3: sort candidates by score, descending (selection sort on indices) ----
    var order = UnsafePointer[Int32].alloc(n_cand if n_cand > 0 else 1)
    for i in range(n_cand):
        order[i] = Int32(i)
    for i in range(n_cand):
        var top = i
        for j in range(i + 1, n_cand):
            if best[Int(cand_idx[Int(order[j])])] > best[Int(cand_idx[Int(order[top])])]:
                top = j
        var tmp = order[i]
        order[i] = order[top]
        order[top] = tmp

    # ---- Pass 4: class-aware greedy NMS ----
    var suppressed = UnsafePointer[Int32].alloc(n_cand if n_cand > 0 else 1)
    for i in range(n_cand):
        suppressed[i] = 0

    var kept = 0
    for a in range(n_cand):
        if kept >= nd:
            break
        var ia = Int(order[a])
        if suppressed[ia] == 1:
            continue

        var pa = Int(cand_idx[ia])
        var ax1 = cand_box[ia * 4 + 0]
        var ay1 = cand_box[ia * 4 + 1]
        var ax2 = cand_box[ia * 4 + 2]
        var ay2 = cand_box[ia * 4 + 3]

        out_boxes[kept * 4 + 0] = ax1
        out_boxes[kept * 4 + 1] = ay1
        out_boxes[kept * 4 + 2] = ax2
        out_boxes[kept * 4 + 3] = ay2
        out_scores[kept] = best[pa]
        out_cls[kept] = best_cls[pa]
        out_idx[kept] = Int32(pa)
        kept += 1

        for b in range(a + 1, n_cand):
            var ib = Int(order[b])
            if suppressed[ib] == 1:
                continue
            var pb = Int(cand_idx[ib])
            if best_cls[pb] != best_cls[pa]:          # different class, never suppress
                continue
            var ov = _iou(
                ax1, ay1, ax2, ay2,
                cand_box[ib * 4 + 0], cand_box[ib * 4 + 1],
                cand_box[ib * 4 + 2], cand_box[ib * 4 + 3],
            )
            if ov > iou_thres:
                suppressed[ib] = 1

    best.free()
    best_cls.free()
    cand_idx.free()
    cand_box.free()
    order.free()
    suppressed.free()
    return Int32(kept)


@export
fn nv_abi_version() -> Int32:
    return 1


fn main():
    # Smoke target: `pixi run mojo run backend/mojo/postprocess.mojo`
    print("nv postprocess kernel, abi", nv_abi_version(), "simd width", SIMD_W)
