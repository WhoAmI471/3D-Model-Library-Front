// components/AddModelButton.js
'use client'

import Link from 'next/link'

export default function AddModelButton() {
  return (
    <Link href="/models/upload">
      <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition">
        ➕ Добавить модель
      </button>
    </Link>
  )
}
