import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({ title: 'About' })

// Enable ISR - revalidate every hour
export const revalidate = 3600

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">About</h1>

      <div className="prose dark:prose-invert">
        <h2 className="text-xl font-semibold">TEAM NOVA</h2>
        <p><strong>[ safeguarding the digital future ]</strong></p>

        <p>
          We are <strong>TEAM NOVA</strong>, a cybersecurity collective dedicated to solving
          today’s most pressing security challenges. We participate in CTF competitions, conduct
          hands-on workshops, and engage in advanced cybersecurity research.
        </p>

        <p>
          Our mission is to stay ahead of emerging threats, drive continuous innovation, and mentor
          the next generation of cybersecurity professionals. From vulnerability research to secure
          coding practices, we actively contribute to strengthening the cybersecurity landscape.
        </p>

        <h3 className="font-semibold mt-8">Track Our Progress</h3>
        <p>Explore our journey and achievements across different platforms:</p>

        <ul>
          <li>
            On <strong>Hack The Box</strong>, our team profile is{' '}
            <a
              href="https://app.hackthebox.com/teams/overview/5351"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 underline"
            >
              TEAM NOVA
            </a>.
          </li>

          <li>
            Follow our rankings and competition history on{' '}
            <a
              href="https://ctftime.org/team/48032"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 underline"
            >
              CTFtime
            </a>.
          </li>
        </ul>
      </div>
    </div>
  )
}
