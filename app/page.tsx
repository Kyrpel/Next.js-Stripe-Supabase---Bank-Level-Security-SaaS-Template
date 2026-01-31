"use client";

import { useAuth } from '@/contexts/AuthContext';
import { PricingSection } from '@/components/PricingSection';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { 
  Lock, Shield, Zap, CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/* eslint-disable @typescript-eslint/no-unused-vars */

const features = [
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-grade encryption and authentication"
  },
  {
    icon: Zap,
    title: "Production Ready",
    description: "Built with TypeScript, Next.js 14, and best practices"
  },
  {
    icon: Lock,
    title: "Secure Payments",
    description: "Stripe integration with PCI compliance"
  }
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0D1117]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        <div className="relative max-w-6xl mx-auto px-6 py-24 sm:py-32">
          {/* Trust badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1E3A5F]/20 border border-[#3B82F6]/30">
              <Shield className="w-4 h-4 text-[#3B82F6]" />
              <span className="text-sm text-[#E5E7EB] font-medium">Enterprise-Grade Security</span>
            </div>
          </motion.div>

          {/* Main heading */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-center text-[#E5E7EB] tracking-tight mb-6 font-rajdhani uppercase"
          >
            Secure SaaS Template
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-center text-[#9CA3AF] max-w-3xl mx-auto mb-12"
          >
            Production-ready Next.js template with authentication, payments, and database. Built for reliability and trust.
          </motion.p>

          {/* CTA buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-20"
          >
            <button 
              onClick={() => router.push('/dashboard')}
              className="secure-button text-lg"
            >
              Start Free Trial
            </button>
            <button 
              className="bg-transparent border-2 border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6]/10 font-medium px-8 py-3 rounded-lg transition-all duration-200"
            >
              View Documentation
            </button>
          </motion.div>

          {/* Feature cards */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
            {features.map((feature, index) => (
              <div key={index} className="trust-card p-6">
                <feature.icon className="w-10 h-10 text-[#3B82F6] mb-4" />
                <h3 className="text-lg font-semibold text-[#E5E7EB] mb-2">{feature.title}</h3>
                <p className="text-[#9CA3AF]">{feature.description}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Technical specs section */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-[#E5E7EB] mb-4 font-rajdhani uppercase">Built on Proven Technology</h2>
            <p className="text-lg text-[#9CA3AF]">Industry-standard tools and frameworks</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Next.js 14", value: "Framework" },
              { label: "Supabase", value: "Database" },
              { label: "Stripe", value: "Payments" },
              { label: "TypeScript", value: "Type Safety" }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="trust-card p-6 text-center"
              >
                <div className="text-2xl font-bold text-[#3B82F6] mb-2">{item.label}</div>
                <div className="text-sm text-[#9CA3AF]">{item.value}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing section */}
      <section id="pricing" className="py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-[#E5E7EB] mb-4 font-rajdhani uppercase">Simple, Transparent Pricing</h2>
          </motion.div>
          <PricingSection />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Shield className="w-16 h-16 text-[#3B82F6] mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-bold text-[#E5E7EB] mb-4 font-rajdhani uppercase">
              Launch Your SaaS with Confidence
            </h2>
            <p className="text-lg text-[#9CA3AF] mb-8">
              Secure, scalable, and production-ready from day one
            </p>
            <button 
              onClick={() => router.push('/dashboard')}
              className="secure-button text-lg"
            >
              Get Started Now
            </button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

