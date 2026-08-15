import React, { useState, useEffect } from "react";
import "./PitchDeck.css";

const UNIFORM_SLIDES = [
  {
    id: "problem_vision",
    badge: "SLIDE 1 OF 3 • PROBLEM & VISION",
    title: "Asynchronous Multi-Modal Emotion Synthesis",
    subtitle: "Resolving noisy, contradictory camera, sensor, and user label streams into a single, unified emotional state.",
    cards: [
      {
        icon: "⚠️",
        title: "Modality Conflicts",
        desc: "Camera detects 'Angry', Wearable reports '60 BPM (Calm)', User explicit label specifies 'Tired'. Without unified synthesis, UX fails.",
        tag: "Multi-Sensor Noise"
      },
      {
        icon: "⏳",
        title: "Out-of-Order Data",
        desc: "Network latency causes events to arrive late and out of sequence. Raw processing leads to state distortion.",
        tag: "Temporal Drift"
      },
      {
        icon: "🎯",
        title: "Unified Synthesis Vision",
        desc: "An evidence-weighted engine that reconciles conflicting signals deterministically to drive personalized audio-visual outputs.",
        tag: "Core Solution"
      }
    ]
  },
  {
    id: "engine_tech",
    badge: "SLIDE 2 OF 3 • CORE ENGINE & TECH",
    title: "Deterministic Evidence Weighting & Replay",
    subtitle: "Mathematical score synthesis combined with strict idempotency and 100% audit trail replayability.",
    formula: "Score = Confidence × Reliability × Temporal Recency (× 1.20 User Label Boost)",
    cards: [
      {
        icon: "🧠",
        title: "Evidence Weighting",
        desc: "Assigns deterministic reliability (Sensor: 1.00 > Camera: 0.90 > Label: 0.80) with a 1.20 boost for recent explicit user intent.",
        tag: "Mathematical Precision"
      },
      {
        icon: "🛡️",
        title: "Idempotent Ingestion",
        desc: "Client-supplied event IDs prevent duplicate payloads from altering state transitions or corrupting audit logs.",
        tag: "State Idempotency"
      },
      {
        icon: "🔁",
        title: "Replay Audit Trail",
        desc: "Appends events and state transitions to JSONL storage, supporting exact deterministic reconstruction via POST /replay.",
        tag: "100% Auditable"
      }
    ]
  },
  {
    id: "impact_roadmap",
    badge: "SLIDE 3 OF 3 • REAL-WORLD IMPACT & ENGINE ACCESS",
    title: "Enterprise Value & Interactive Application",
    subtitle: "Powering bio-feedback music streaming, digital health, adaptive gaming, and auditable clinical tracking.",
    cards: [
      {
        icon: "🎧",
        title: "Media & Digital Health",
        desc: "Dynamic playlist adaptation and bio-reactive anxiety management responding in real-time to physiological signals.",
        tag: "Streaming & Health"
      },
      {
        icon: "🎮",
        title: "Gaming & Clinical Audits",
        desc: "Bio-reactive game difficulty and verifiable, auditable patient emotion tracking for clinical trial compliance.",
        tag: "Adaptive Experience"
      },
      {
        icon: "⚡",
        title: "Sub-500ms Scale",
        desc: "Handles 100+ events/sec asynchronously with zero external vendor lock-in or third-party ML dependency.",
        tag: "Enterprise Performance"
      }
    ]
  }
];

export default function PitchDeck({ onMoveToDashboard }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentSlide = UNIFORM_SLIDES[currentIndex];

  const goNext = () => {
    if (currentIndex < UNIFORM_SLIDES.length - 1) setCurrentIndex(prev => prev + 1);
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        goNext();
      } else if (e.key === "ArrowLeft") {
        goPrev();
      } else if (e.key === "Enter" && onMoveToDashboard) {
        onMoveToDashboard();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex]);

  return (
    <div className="deck-container">
      {/* Top Header Navigation with Centered Primary CTA Button */}
      <div className="deck-nav">
        <div className="deck-brand">
          <span>✨</span> EMOTION SYNTHESIS
        </div>

        {/* PROMINENT CENTERED BUTTON */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button className="btn-move-dashboard-centered" onClick={onMoveToDashboard}>
            Move to Application →
          </button>
        </div>

        <div style={{ textAlign: "right", fontSize: "13px", color: "#64748b" }}>
          Press <kbd style={{ background: "rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: "4px", color: "#cbd5e1" }}>Enter</kbd> to launch
        </div>
      </div>

      {/* Main Slide Card */}
      <div className="slide-wrapper">
        <div className="slide-card" key={currentSlide.id}>
          <div>
            <div className="badge">{currentSlide.badge}</div>
            <h1 className="slide-title">{currentSlide.title}</h1>
            <p className="slide-subtitle">{currentSlide.subtitle}</p>

            {currentSlide.formula && (
              <div className="formula-banner">
                {currentSlide.formula}
              </div>
            )}

            <div className="grid-3-uniform">
              {currentSlide.cards.map((card, idx) => (
                <div className="card-uniform" key={idx}>
                  <div>
                    <div className="card-icon">{card.icon}</div>
                    <h3>{card.title}</h3>
                    <p>{card.desc}</p>
                  </div>
                  <span className="tag-highlight">{card.tag}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Slide 3 Large Centered CTA */}
          {currentIndex === UNIFORM_SLIDES.length - 1 && (
            <div style={{ marginTop: "24px", display: "flex", justifyContent: "center" }}>
              <button
                className="btn-move-dashboard-centered"
                style={{ fontSize: "18px", padding: "16px 40px" }}
                onClick={onMoveToDashboard}
              >
                🚀 Move to Application →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation & Progress */}
      <div className="deck-footer">
        <div className="slide-counter">
          Slide {currentIndex + 1} of {UNIFORM_SLIDES.length}
        </div>

        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${((currentIndex + 1) / UNIFORM_SLIDES.length) * 100}%` }}
          />
        </div>

        <div className="deck-nav-btns">
          <button className="nav-arrow" onClick={goPrev} disabled={currentIndex === 0}>
            ←
          </button>
          <button
            className="nav-arrow"
            onClick={goNext}
            disabled={currentIndex === UNIFORM_SLIDES.length - 1}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
