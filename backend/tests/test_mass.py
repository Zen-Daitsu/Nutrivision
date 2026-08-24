from app.mass import Scale, estimate_mass_g, scale_from_fiducial


def test_fiducial_scale():
    s = scale_from_fiducial(card_width_px=171.2, card_width_mm=85.6)
    assert round(s.px_per_mm, 2) == 2.0
    assert s.confidence == "high"


def test_mass_scales_with_area():
    s = Scale(px_per_mm=2.0, confidence="high")
    small = estimate_mass_g("white_rice", 10_000, s)
    large = estimate_mass_g("white_rice", 40_000, s)
    assert large > small


def test_mass_is_clamped():
    s = Scale(px_per_mm=2.0, confidence="high")
    assert estimate_mass_g("broccoli", 50_000_000, s) == 800.0
    assert estimate_mass_g("broccoli", 0, s) == 0.0
