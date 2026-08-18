export function moveItemInList<T>(items: T[], fromIndex: number, delta: -1 | 1): T[] {
  const toIndex = fromIndex + delta
  if (toIndex < 0 || toIndex >= items.length) return items
  const next = items.slice()
  const [item] = next.splice(fromIndex, 1)
  if (item === undefined) return items
  next.splice(toIndex, 0, item)
  return next
}
