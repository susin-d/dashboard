import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { faqItems } from '../constants'

export function FAQSection() {
  const [openFaq, setOpenFaq] = useState(0)
  return (
    <section className="landing-faq-section" id="faq">
      <div className="landing-section-heading scroll-reveal">
        <p className="section-eyebrow">Frequently Asked Questions</p>
        <h2>Everything you need to know</h2>
        <span className="section-subtitle">Transparent by design. Your data stays yours.</span>
      </div>
      <div className="landing-faq-list scroll-reveal reveal-delay-2">
        {faqItems.map((item, index) => {
          const isOpen = openFaq === index
          return (
            <div key={item.question} className={`faq-item ${isOpen ? 'open' : ''}`}>
              <button
                type="button"
                className="faq-question"
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${index}`}
                onClick={() => setOpenFaq(isOpen ? -1 : index)}
              >
                <h3>{item.question}</h3>
                <span className="faq-toggle-btn" aria-hidden="true"><ChevronDown size={18} className={isOpen ? 'rotate-180' : ''} /></span>
              </button>
              {isOpen && (
                <div id={`faq-answer-${index}`} className="faq-answer"><p>{item.answer}</p></div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
