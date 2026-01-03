import { useEffect, useState } from "react";
import "./RoadMap.css";

export default function RoadMap() {
  const targetDate = new Date("2026-03-19T00:00:00").getTime();

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance <= 0) {
        clearInterval(interval);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor(
          (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        ),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="StyleContador">
      <div style={{ textAlign: "center" }}>
        <h1 style={{ color: "red" }}>RECEITA FEDERAL</h1>
      </div>

      <div className="counter-up">
        <div className="content">
          <div className="timer">
            <p>{timeLeft.days}</p>
            <h6>days</h6>
          </div>

          <div className="timer">
            <p>{timeLeft.hours}</p>
            <h6>hours</h6>
          </div>

          <div className="timer">
            <p>{timeLeft.minutes}</p>
            <h6>minutes</h6>
          </div>

          <div className="timer">
            <p>{timeLeft.seconds}</p>
            <h6>seconds</h6>
          </div>
        </div>
      </div>
    </section>
  );
}
