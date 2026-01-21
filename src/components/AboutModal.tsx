import React from 'react';
import { X } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">About Rhubarb Curator</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
            title="Close"
            aria-label="Close about modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 select-text">
          <section className="space-y-4">
            <h1 className="text-3xl font-extrabold text-gray-900">Welcome to the Rhubarb Curator App</h1>
            <p className="text-xl font-semibold text-blue-600 italic">Cultivating Knowledge for Healthcare Communities</p>
            <p className="text-gray-700 leading-relaxed">
              Just as a gardener tends their plot—preparing soil, planting seeds, pruning for growth—you, as a curator, cultivate knowledge that helps healthcare facilities thrive. The Rhubarb Curator App is your digital greenhouse, where expertise grows into actionable intelligence for rural and suburban healthcare communities.
            </p>
            <p className="text-gray-700 leading-relaxed">
              This isn't just another wiki or document repository. It's a living knowledge garden where your hard-won experience becomes the foundation for others' success.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">What is the Curator App?</h2>
            <p className="text-gray-700 leading-relaxed">
              The Curator App is where expert healthcare informaticists build and maintain knowledge domains that power the Rhubarb platform. Think of it as your master gardening workbench—where you:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Document your real-world implementations, case studies, and lessons learned</li>
              <li>Organize content into searchable, AI-ready knowledge chunks</li>
              <li>Update guides as standards evolve and new insights emerge</li>
              <li>Review community feedback and enhance content based on real-world usage</li>
              <li>Build intellectual property that you own a stake in</li>
            </ul>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">How Knowledge Grows: The Rhubarb Garden</h2>
            
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <span>🌱</span> Preparing the Knowledge Soil (Chunking)
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Just like composting breaks down organic matter into nutrient-rich soil that feeds your garden, our chunking process transforms dense documents into digestible pieces that feed our AI's ability to give practitioners exactly the answer they need, when they need it.
              </p>
              <p className="text-gray-700 leading-relaxed">
                When you upload a document, the Curator App:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Breaks content into meaningful sections (chunks)</li>
                <li>Preserves context so each piece makes sense independently</li>
                <li>Organizes these chunks for rapid AI retrieval</li>
                <li>Creates rich soil where knowledge can take root and grow</li>
              </ul>
              <p className="text-gray-700 italic bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                The result? When a practitioner asks, "How do I implement FHIR for a 35-bed CAH with Epic?" the AI instantly retrieves the most relevant chunks from your expertise—not a 50-page PDF they have to search through.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <span>🌿</span> Planting Seeds (Content Creation)
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Every guide, template, and case study you create is a seed planted in the Rhubarb knowledge garden. You're not just writing documentation—you're cultivating resources that will help dozens, then hundreds of facilities grow stronger.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Your seeds are special because they come from real-world experience. They've already proven they can grow in the challenging soil of rural healthcare—limited budgets, small IT teams, connectivity constraints.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <span>✂️</span> Pruning and Tending (Maintenance)
              </h3>
              <p className="text-gray-700 leading-relaxed">
                A garden needs constant attention. Standards change. New regulations emerge. Better approaches are discovered. As a curator, you prune outdated information and nurture new growth. Your knowledge stays living and relevant, not static and stale.
              </p>
              <p className="text-gray-700 leading-relaxed">
                The community helps you tend the garden—they leave comments, share successes, and point out what needs updating. Together, you create something far richer than any individual could alone.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <span>🌾</span> Harvesting (Impact)
              </h3>
              <p className="text-gray-700 leading-relaxed">
                When a small hospital successfully implements FHIR using your guide, when a clinic wins a grant using your template, when an IT director saves 20 hours of research thanks to your documentation—that's the harvest. And unlike a traditional harvest that depletes the soil, every success enriches the knowledge garden for the next practitioner.
              </p>
            </div>
          </section>

          <section className="space-y-6 bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Beginner's Guide: Your First 30 Days as a Curator</h2>
            <p className="text-gray-700">Starting as a curator can feel overwhelming—but remember, every expert gardener started with their first seed. Here's your step-by-step guide to becoming a confident curator.</p>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-gray-800 mb-3">Week 1: Prepare Your Garden Bed</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded shadow-sm">
                    <p className="font-semibold text-blue-700 mb-2">Day 1-2: Explore</p>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Tour existing domains</li>
                      <li>• Read 3-5 articles</li>
                      <li>• Note what makes them useful</li>
                    </ul>
                  </div>
                  <div className="bg-white p-4 rounded shadow-sm">
                    <p className="font-semibold text-blue-700 mb-2">Day 3-4: Define</p>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Choose focus area</li>
                      <li>• List 5-10 topics</li>
                      <li>• Gather documentation</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded shadow-sm border-t-4 border-green-500">
                  <p className="font-bold text-gray-800 mb-1">Week 2</p>
                  <p className="text-xs text-gray-500 mb-2">Plant More Seeds</p>
                  <p className="text-sm text-gray-600">Create 2-3 more articles. Build depth with beginner to advanced content.</p>
                </div>
                <div className="bg-white p-4 rounded shadow-sm border-t-4 border-yellow-500">
                  <p className="font-bold text-gray-800 mb-1">Week 3</p>
                  <p className="text-xs text-gray-500 mb-2">Learn the Tools</p>
                  <p className="text-sm text-gray-600">Understand chunking. Use clear headings to help the AI structure your knowledge.</p>
                </div>
                <div className="bg-white p-4 rounded shadow-sm border-t-4 border-purple-500">
                  <p className="font-bold text-gray-800 mb-1">Week 4</p>
                  <p className="text-xs text-gray-500 mb-2">Engage</p>
                  <p className="text-sm text-gray-600">Monitor comments. Update articles based on feedback and identify gaps.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Tips for Long-Term Success</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="font-bold text-gray-800">1. Document as You Go</p>
                <p className="text-sm text-gray-700">Don't wait until a project is done. Take notes and screenshots during implementation.</p>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-gray-800">2. Start Specific</p>
                <p className="text-sm text-gray-700">Specific is better than vague. Practitioners can adapt specifics to their own situation.</p>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-gray-800">3. Include Failures</p>
                <p className="text-sm text-gray-700">"What didn't work" is often the most valuable knowledge you can share.</p>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-gray-800">4. Set a Sustainable Pace</p>
                <p className="text-sm text-gray-700">This is a marathon. Consistent steady contribution has a massive compound effect.</p>
              </div>
            </div>
          </section>

          <section className="space-y-4 bg-blue-900 text-white p-8 rounded-xl">
            <h2 className="text-2xl font-bold">The Bigger Picture: Why Your Work Matters</h2>
            <p className="text-blue-100 leading-relaxed">
              Rural and suburban healthcare facilities face unique challenges—limited budgets, small IT teams, geographic isolation. Yet they serve millions of Americans who depend on them for care.
            </p>
            <p className="text-blue-100 leading-relaxed">
              When you document how to implement FHIR on a shoestring budget, or share a grant template that worked, you're not just writing an article. You're enabling better patient outcomes and giving overworked IT directors their time back.
            </p>
            <p className="text-lg font-semibold text-blue-300">
              Your knowledge garden doesn't just grow information—it grows capacity, confidence, and community resilience.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Common Questions</h2>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-200 pl-4">
                <p className="font-bold text-gray-800">"How long should my articles be?"</p>
                <p className="text-gray-700">Quality matters more than length. A focused 500-word troubleshooting guide can be more valuable than a rambling 5,000-word overview.</p>
              </div>
              <div className="border-l-4 border-blue-200 pl-4">
                <p className="font-bold text-gray-800">"What if I'm not confident in my writing?"</p>
                <p className="text-gray-700">You're not writing a dissertation—you're helping a peer. Write like you're explaining it to a colleague over coffee.</p>
              </div>
            </div>
          </section>

          <footer className="pt-8 border-t border-gray-100 text-center">
            <p className="text-gray-600 mb-4">Ready to Start Cultivating?</p>
            <p className="text-sm text-gray-500">
              Questions? Need help getting started? Contact the Curator Success Team at{' '}
              <a href="mailto:curators@rhubarb.health" className="text-blue-600 hover:underline font-medium">
                curators@rhubarb.health
              </a>
            </p>
            <p className="mt-6 text-2xl">Plant yours today. 🌱</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
