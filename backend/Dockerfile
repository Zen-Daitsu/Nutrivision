# Stage 1 — compile the Mojo kernel with the pinned MAX toolchain.
FROM ghcr.io/prefix-dev/pixi:0.41.4 AS mojo
WORKDIR /build
COPY pixi.toml pixi.lock ./
RUN pixi install --locked
COPY mojo/ ./mojo/
RUN mkdir -p mojo/build && \
    pixi run mojo build --emit shared-lib mojo/postprocess.mojo -o mojo/build/libnvpost.so

# Stage 2 — runtime.
FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgl1 libglib2.0-0 curl && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY data/ ./data/
COPY models/ ./models/
COPY --from=mojo /build/mojo/build/libnvpost.so ./mojo/build/libnvpost.so

RUN useradd -r -u 10001 nutrivision && chown -R nutrivision /srv
USER nutrivision

ENV NV_MODEL_PATH=/srv/models/yolov8s-seg.onnx \
    NV_MOJO_LIB_PATH=/srv/mojo/build/libnvpost.so \
    NV_ORT_INTRA_THREADS=4
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -fsS http://localhost:8000/healthz || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
