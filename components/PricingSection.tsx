// File: /components/PricingSection.tsx

// import Link from 'next/link';
// import { StripeBuyButton } from './StripeBuyButton';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// interface PricingSectionProps {
//   showFullDetails?: boolean;
// }

const pricingTiers = [
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    interval: "/month",
    description: "Perfect for small teams and startups",
    features: [
      "All template features",
      "Priority support",
      "Custom branding",
      "Analytics dashboard",
      "Team collaboration"
    ],
    cta: "Get Started",
    popular: false
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$49",
    interval: "/month",
    description: "For larger organizations",
    features: [
      "Everything in Pro",
      "Advanced security",
      "Custom integrations",
      "24/7 support",
      "SLA guarantee"
    ],
    cta: "Start Trial",
    popular: true
  },
  {
    id: "custom",
    name: "Custom",
    price: "Custom",
    interval: "",
    description: "Tailored to your needs",
    features: [
      "Custom development",
      "Dedicated support",
      "Custom SLA",
      "On-premise options",
      "Training sessions"
    ],
    cta: "Contact Sales",
    popular: false
  }
];

export function PricingSection() {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<string | null>("enterprise");

  const handleTierClick = (tierId: string) => {
    setSelectedTier(currentTier => currentTier === tierId ? null : tierId);
  };

  const handleCTAClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push('/profile');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
      {pricingTiers.map((tier, i) => (
        <motion.div
          key={tier.name}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          onClick={() => handleTierClick(tier.id)}
          className={`relative rounded-2xl p-8 shadow-lg cursor-pointer transition-all duration-300 ${
            selectedTier === tier.id
              ? 'bg-[#1E3A5F]/10 ring-2 ring-[#3B82F6] transform scale-105'
              : 'bg-[#161B22] ring-1 ring-white/10 hover:ring-[#3B82F6]/50'
          }`}
        >
          {/* Show Popular badge only for Enterprise tier */}
          {tier.popular && (
            <span className="absolute top-0 right-6 -translate-y-1/2 px-3 py-1 text-sm bg-[#3B82F6] text-white rounded-full font-medium">
              Popular
            </span>
          )}
          <h3 className="text-xl font-semibold text-[#E5E7EB]">{tier.name}</h3>
          <div className="mt-4 flex items-baseline">
            <span className="text-4xl font-bold text-[#E5E7EB]">{tier.price}</span>
            <span className="ml-1 text-[#9CA3AF]">{tier.interval}</span>
          </div>
          <p className="mt-4 text-[#9CA3AF]">{tier.description}</p>
          <ul className="mt-8 space-y-4">
            {tier.features.map((feature) => (
              <li key={feature} className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-[#3B82F6] mr-3" />
                <span className="text-[#E5E7EB]">{feature}</span>
              </li>
            ))}
          </ul>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCTAClick}
            className={`mt-8 w-full py-3 px-4 rounded-lg text-center font-medium transition-colors ${
              selectedTier === tier.id
                ? 'bg-[#1E3A5F] text-white hover:bg-[#2C5282]'
                : 'bg-[#3B82F6] text-white hover:bg-[#2563EB]'
            }`}
          >
            {tier.cta}
          </motion.button>
        </motion.div>
      ))}
    </div>
  );
}