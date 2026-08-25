from std.memory import Pointer, MutOrigin

@export("nv_abi_version")
def nv_abi_version() abi("C") -> Int32:
    return 1

@export("nv_decode_nms")
def nv_decode_nms(
    preds: Pointer[Float32, MutOrigin.external],
    n_preds: Int32,
    out_boxes: Pointer[Float32, MutOrigin.external],
) abi("C") -> Int32:
    return 0
