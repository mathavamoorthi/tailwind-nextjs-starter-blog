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
      {/* Full-height flex column layout */}
      <div className={`${inter.className} flex min-h-screen flex-col font-sans`}>
        <Header />

        {/* Content grows to fill vertical space */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer always at the bottom */}
        <Footer />
      </div>
    </SectionContainer>
  )
}

export default LayoutWrapper
