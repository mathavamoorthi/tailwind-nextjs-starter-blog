import { Inter } from 'next/font/google'
import SectionContainer from './SectionContainer'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

const inter = Inter({
  subsets: ['latin'],
})

const LayoutWrapper = ({ children }: Props) => {
  return (
    <SectionContainer>
      <div className={`${inter.className} font-sans`}>
        {children}
      </div>
    </SectionContainer>
  )
}

export default LayoutWrapper
