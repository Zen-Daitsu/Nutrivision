# NutriVision

Point a phone camera at a plate, get protein / carbs / fat / kcal. PWA front end,
FastAPI orchestrator, YOLOv8-seg over ONNX Runtime, Mojo kernel for decode + NMS,
USDA FoodData Central for the macro tables.

```
nutrivision/
├── .github/workflows/
│   ├── ci.yml                  lint, unit tests, data contract, Mojo parity
│   ├── deploy-frontend.yml     S3 sync + CloudFront invalidation (OIDC)
│   └── deploy-backend.yml      ECR build/push + SSM container roll (OIDC)
├── frontend/
│   ├── index.html              viewfinder + macro readout
│   ├── css/styles.css
│   ├── js/camera.js            getUserMedia lifecycle, canvas frame capture
│   ├── js/api.js               multipart fetch, timeout, retry, typed errors
│   ├── js/app.js               state machine + rendering
│   ├── manifest.json           installable PWA
│   ├── sw.js                   shell precache; /api/* never cached
│   └── icons/                  192, 512, maskable-512
├── backend/
│   ├── app/
│   │   ├── main.py             FastAPI, CORS, multipart intake, orchestration
│   │   ├── config.py           env-driven settings
│   │   ├── schemas.py          frozen response contract
│   │   ├── inference.py        ORT session, letterbox, dispatch
│   │   ├── postprocess.py      NumPy decode/NMS — correctness oracle + fallback
│   │   ├── mojo_bridge.py      ctypes FFI to libnvpost.so
│   │   ├── mass.py             segmented area -> mass
│   │   └── nutrition.py        USDA FDC client, disk cache, offline fallback
│   ├── mojo/postprocess.mojo   SIMD decode + class-aware NMS, C ABI export
│   ├── data/nutrition_db.json  offline macro table
│   ├── models/                 DVC-tracked ONNX + classes.json (gitignored)
│   ├── tests/                  postprocess parity, data contract, mass
│   ├── Dockerfile              2-stage: pixi/Mojo build -> python:3.12-slim
│   ├── pixi.toml               pinned MAX toolchain
│   └── requirements.txt
├── ml/
│   ├── class_map.yaml          FoodSeg103 id -> project class id
│   ├── compile_dataset.py      masks -> YOLO polygons, deterministic split
│   ├── validate_dataset.py     CI data contract gate
│   ├── train.py                fine-tune yolov8s-seg
│   └── export_model.py         ONNX export + torch/ONNX parity assertion
├── infra/                      Terraform: S3+CloudFront, ECR, EC2, API GW, OIDC IAM
├── scripts/dev.sh
├── dvc.yaml                    compile -> validate -> train -> export
└── .gitignore
```

## Build sequence

```bash
# 0. secrets
#    Rotate any AWS key that has ever been committed, then use OIDC only.

# 1. infrastructure
cd infra && terraform init && terraform apply -var github_repo=OWNER/REPO
#    Copy outputs into GitHub:
#    secret  AWS_DEPLOY_ROLE_ARN   <- gha_deploy_role_arn
#    secret  USDA_API_KEY          <- https://fdc.nal.usda.gov/api-key-signup
#    var     FRONTEND_BUCKET, CLOUDFRONT_DISTRIBUTION_ID, FRONTEND_DOMAIN
#    var     API_BASE_URL, API_DOMAIN, EC2_INSTANCE_ID, MODEL_BUCKET

# 2. dataset
dvc pull                                   # or place FoodSeg103 under data/
dvc repro compile validate                 # fails loudly on contract violations
dvc push

# 3. model
python ml/train.py --data my_dataset/data.yaml --epochs 120      # T4 / g4dn
python ml/export_model.py --weights runs/nutrivision/weights/best.pt
aws s3 cp backend/models/yolov8s-seg.onnx s3://$MODEL_BUCKET/models/

# 4. Mojo kernel
cd backend && pixi install --locked && pixi run build-kernel
nm -D mojo/build/libnvpost.so | grep nv_decode_nms
pytest -q                                  # asserts kernel == NumPy oracle

# 5. run locally
./scripts/dev.sh                           # API :8000, PWA :5173

# 6. deploy
git push origin main                       # both deploy workflows fire on path filters
curl https://$API_DOMAIN/healthz
```

## Response contract

```json
{
  "items": [{
    "class_id": 0, "name": "chicken_breast", "confidence": 0.91,
    "box_xyxy": [212.0, 145.0, 640.0, 512.0], "mask_area_px": 148230,
    "mass_g": 162.4, "mass_confidence": "high",
    "macros": {"protein": 50.3, "carbs": 0.0, "fat": 5.9, "calories": 268.0},
    "fdc_id": 171477
  }],
  "totals": {"protein": 61.2, "carbs": 44.8, "fat": 8.1, "calories": 497.0},
  "inference_ms": 84.1, "postprocess_ms": 6.3, "source": "mojo",
  "scale_px_per_mm": 2.04
}
```

## Known limits

- **Mass is modelled, not measured.** A monocular image has no depth. The
  area→volume heuristic (`h = k·√A`) carries roughly ±25–40% error even with a
  fiducial in frame, and worse without one. Every downstream macro inherits it.
- **Mojo accelerates postprocessing only.** The convolutional graph runs on ONNX
  Runtime. Claims of "35000x faster than Python" describe a scalar Mandelbrot
  microbenchmark against pure CPython, not an inference pipeline; the honest
  figure to report is the measured `postprocess_ms` delta between
  `source: "mojo"` and `source: "numpy"` on the same frame.
- **FoodSeg103 is a fixed-ingredient benchmark.** Generalisation to cafeteria
  trays needs the 300-image real-capture set in the training mix, not just as
  a test set.
