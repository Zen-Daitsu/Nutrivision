from std.memory import UnsafePointer

@export("nv_abi_version")
def nv_abi_version() abi("C") -> Int32:
    return 1

@export("nv_decode_nms")
def nv_decode_nms(
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
) abi("C") -> Int32:
    return 0
