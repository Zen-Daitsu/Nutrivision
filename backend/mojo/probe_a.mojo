from std.memory import UnsafePointer

@export("nv_abi_version")
def nv_abi_version() abi("C") -> Int32:
    return 1

@export("nv_decode_nms")
def nv_decode_nms(
    preds: UnsafePointer[Float32, _],
    n_preds: Int32,
    out_boxes: UnsafePointer[Float32, _],
) abi("C") -> Int32:
    return 0
