"""Correctness oracle for the decode path. The Mojo kernel must match NumPy."""
import numpy as np
import pytest

from app import postprocess


def synth_output(n_preds=64, nc=3, seed=0):
    rng = np.random.default_rng(seed)
    n_attrs = 4 + nc + postprocess.NUM_MASK_COEF
    arr = rng.random((1, n_attrs, n_preds), dtype=np.float32) * 0.1
    # two confident, overlapping boxes of the same class + one distinct box
    arr[0, :4, 0] = [100, 100, 50, 50]; arr[0, 4, 0] = 0.90
    arr[0, :4, 1] = [104, 102, 52, 50]; arr[0, 4, 1] = 0.80   # IoU high -> suppressed
    arr[0, :4, 2] = [400, 400, 60, 60]; arr[0, 5, 2] = 0.75   # different class
    return arr, np.zeros((1, 32, 160, 160), np.float32)


def test_nms_suppresses_duplicate_same_class():
    o0, o1 = synth_output()
    boxes, scores, cls, masks = postprocess.decode(o0, o1, 0.30, 0.50, 30)
    assert len(boxes) == 2
    assert scores[0] == pytest.approx(0.90, abs=1e-5)
    assert set(cls.tolist()) == {0, 1}


def test_conf_threshold_filters_everything():
    o0, o1 = synth_output()
    boxes, *_ = postprocess.decode(o0, o1, 0.99, 0.50, 30)
    assert len(boxes) == 0


def test_xywh_to_xyxy_roundtrip():
    b = np.array([[100.0, 100.0, 50.0, 40.0]], np.float32)
    x = postprocess._xywh_to_xyxy(b)
    assert x.tolist() == [[75.0, 80.0, 125.0, 120.0]]


@pytest.mark.skipif(
    not __import__("os").path.exists("mojo/build/libnvpost.so"),
    reason="Mojo kernel not built on this runner",
)
def test_mojo_matches_numpy():
    from app import mojo_bridge
    assert mojo_bridge.load("mojo/build/libnvpost.so")
    o0, o1 = synth_output()
    m_boxes, m_scores, m_cls, _ = mojo_bridge.decode_nms(o0, 0.30, 0.50, 30)
    n_boxes, n_scores, n_cls, _ = postprocess.decode(o0, o1, 0.30, 0.50, 30)
    np.testing.assert_allclose(np.sort(m_scores), np.sort(n_scores), rtol=1e-5)
    np.testing.assert_allclose(m_boxes[np.argsort(-m_scores)],
                               n_boxes[np.argsort(-n_scores)], rtol=1e-4)
    assert sorted(m_cls.tolist()) == sorted(n_cls.tolist())
