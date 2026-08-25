@export("nv_abi_version", ABI="C")
def nv_abi_version() abi("C") -> Int32:
    return 1

def main():
    print("probe b ok")
