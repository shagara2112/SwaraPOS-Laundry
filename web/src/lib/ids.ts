let counter = 0

/** ID unik untuk entitas yang dibuat di browser (bukan untuk seed yang harus deterministik). */
export function newId(prefix: string): string {
  counter += 1
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${random}`
}
