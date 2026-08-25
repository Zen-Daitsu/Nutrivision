@export("nv_abi_version", ABI="C")
def nv_abi_version() -> Int32:
    return 1

def main():
    print("probe ok")
