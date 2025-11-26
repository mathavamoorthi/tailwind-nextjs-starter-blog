import { Inter } from 'next/font/google'
import SectionContainer from './SectionContainer'
import Footer from './Footer'
import { ReactNode } from 'react'
import Header from './Header'

interface Props {
  children: ReactNode
}

const inter = Inter({
  subsets: ['latin'],
})

const LayoutWrapper = ({ children }: Props) => {
  return (
    <SectionContainer>
      <div className={`${inter.className} min-h-screen flex flex-col font-sans`}>
        <Header />

        {/* Main grows to fill remaining space */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer always stays at bottom */}
        <footer className="mt-auto">
          <Footer />
        </footer>
      </div>
    </SectionContainer>
  )
}

export default LayoutWrapper
