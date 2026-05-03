import { Outlet } from 'react-router-dom'
import Header from './Header'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <>
      <div className="flex min-h-svh justify-center bg-slate-900">
        <div className="flex w-full max-w-[480px] flex-col bg-slate-950">
          <Header />
          <main className="flex flex-1 flex-col overflow-y-auto pb-20">
            <Outlet />
          </main>
        </div>
      </div>
      <BottomNav />
    </>
  )
}
