import { useEffect, useState } from 'react'

export function useLocalRevision() {
  const [, setRevision] = useState(0)
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1)
    window.addEventListener('cavern:data-changed', refresh)
    return () => window.removeEventListener('cavern:data-changed', refresh)
  }, [])
}
