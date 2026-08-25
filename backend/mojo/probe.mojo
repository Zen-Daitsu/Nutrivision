@export
def nv_abi_version() -> Int32 abi("C"):
    return 1

def main():
    print("probe ok")
