from std.memory import Pointer

@export("nv_abi_version")
def nv_abi_version() abi("C") -> Int32:
    return 1

@export("nv_decode_nms")
def nv_decode_nms(
    preds: Pointer[Float32, _],
    n_preds: Int32,
    out_boxes: Pointer[Float32, _],
) abi("C") -> Int32:
    return 0
