export default function CSSTest() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">🎨 CSS Test Page</h1>
      
      {/* Tailwind Basic Test */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Tailwind CSS Basic Test</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-500 text-white p-4 rounded-lg">
            <h3 className="font-bold">Blue Card</h3>
            <p className="text-blue-100">Basic Tailwind styling</p>
          </div>
          <div className="bg-green-500 text-white p-4 rounded-lg">
            <h3 className="font-bold">Green Card</h3>
            <p className="text-green-100">Colors working</p>
          </div>
          <div className="bg-purple-500 text-white p-4 rounded-lg">
            <h3 className="font-bold">Purple Card</h3>
            <p className="text-purple-100">Layout working</p>
          </div>
        </div>
      </div>

      {/* Executive Assistant Custom Classes Test */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Executive Assistant Custom Classes</h2>
        <div className="space-y-4">
          <div className="ea-card p-6">
            <h3 className="font-bold text-gray-900 mb-2">EA Card Component</h3>
            <p className="text-gray-600">Testing custom .ea-card class</p>
          </div>
          
          <div className="flex space-x-4">
            <button className="ea-button-primary">
              Primary Button
            </button>
            <button className="ea-button-secondary">
              Secondary Button
            </button>
          </div>

          <div className="ea-glass p-4 rounded-lg">
            <p className="text-gray-800">Glass effect background</p>
          </div>
        </div>
      </div>

      {/* Theme Colors Test */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Custom Theme Colors</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-primary-600 text-white p-4 rounded-lg text-center">
            <div className="font-bold">Primary</div>
            <div className="text-sm opacity-90">600</div>
          </div>
          <div className="bg-secondary-600 text-white p-4 rounded-lg text-center">
            <div className="font-bold">Secondary</div>
            <div className="text-sm opacity-90">600</div>
          </div>
          <div className="bg-success-600 text-white p-4 rounded-lg text-center">
            <div className="font-bold">Success</div>
            <div className="text-sm opacity-90">600</div>
          </div>
          <div className="bg-danger-600 text-white p-4 rounded-lg text-center">
            <div className="font-bold">Danger</div>
            <div className="text-sm opacity-90">600</div>
          </div>
        </div>
      </div>

      {/* Animation Test */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Animations</h2>
        <div className="flex space-x-4">
          <div className="animate-fade-in bg-blue-100 p-4 rounded-lg">
            Fade In Animation
          </div>
          <div className="animate-bounce-subtle bg-green-100 p-4 rounded-lg">
            Bounce Subtle
          </div>
          <div className="animate-pulse-slow bg-yellow-100 p-4 rounded-lg">
            Pulse Slow
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
          <div>
            <h3 className="font-semibold text-green-800">CSS Status</h3>
            <p className="text-green-600">If you can see this properly styled, Tailwind CSS is working!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
