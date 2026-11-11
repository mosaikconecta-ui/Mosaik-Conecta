/**
 * Exibido quando WebGL não está disponível. Ilustração vetorial leve — o conteúdo
 * essencial da página continua acessível normalmente.
 */
export function StaticToothFallback() {
  return (
    <div className="absolute inset-0 grid place-items-center md:justify-end md:pr-[12vw]">
      <svg viewBox="0 0 200 260" className="h-[46vh] max-h-[460px] w-auto opacity-90" role="img" aria-label="Ilustração de um dente">
        <defs>
          <radialGradient id="fb-g" cx="40%" cy="30%" r="75%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset=".55" stopColor="#e7f3ee" />
            <stop offset="1" stopColor="#9fc7b9" />
          </radialGradient>
        </defs>
        <path
          fill="url(#fb-g)"
          stroke="#A4FFE1"
          strokeOpacity=".5"
          d="M40 30c18-18 42-12 60-4 18-8 42-14 60 4 20 20 14 62 2 92-6 16-6 30-8 52-3 34-10 66-24 66-16 0-14-46-30-70-16 24-14 70-30 70-14 0-21-32-24-66-2-22-2-36-8-52C26 92 20 50 40 30z"
        />
      </svg>
    </div>
  )
}
