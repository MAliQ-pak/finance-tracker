import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="flex h-svh justify-center bg-[#080808]">
      <div className="flex w-full max-w-[480px] flex-col bg-[#080808]">
        <main className="flex flex-1 flex-col overflow-y-auto">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
