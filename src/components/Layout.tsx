import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import WalletRolloverModal from './WalletRolloverModal'

export default function Layout() {
  return (
    <div className="flex h-svh justify-center bg-[var(--bg-base)]">
      <div className="flex w-full max-w-[480px] flex-col bg-[var(--bg-base)]">
        <main className="flex flex-1 flex-col overflow-y-auto">
          <Outlet />
        </main>
        <BottomNav />
      </div>
      <WalletRolloverModal />
    </div>
  )
}
