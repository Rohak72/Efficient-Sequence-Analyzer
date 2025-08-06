import { useNavigate } from 'react-router-dom';
import spinny from '../assets/DNA-Orbit-Animated.gif'
import '../styles/Home.css'

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
    <div className="home">
      <div className="home">
        
        {/* Text and CTA Section */}
        <div className="flex-1">
          <h1 className="text-4xl md:text-6xl font-bold mb-7">
            Resolve a DNA sequence into its most likely{' '} 
            <span className="relative inline-block text-purple-100 animate-text-glow after:bg-purple-100 after:absolute after:h-1 after:w-0 after:bottom-[-15px] 
            after:left-0 hover:after:w-full after:transition-all after:duration-300">protein target.</span>
          </h1>

          <p className="text-lg md:text-xl text-black-200 mb-8">
            Our pipeline performs six-frame translation and high-accuracy protein alignment, all in one.
          </p>

          <div className="flex gap-3">

            <button className="group relative h-12 overflow-hidden rounded-xl bg-white px-6 py-2 text-black text-lg 
            drop-shadow-xl font-semibold border-2 border-white cursor-pointer" onClick={() => navigate('/viewer')}>
              <span className="relative z-10 transition-colors duration-500 group-hover:text-white">
                Try It Out!
              </span>
              <span className="absolute inset-0 overflow-hidden rounded-md">
                <span className="absolute left-0 aspect-square w-full origin-center -translate-x-full rounded-full bg-violet-500 
                          transition-all duration-500 group-hover:-translate-x-0 group-hover:scale-150">
                </span>
              </span>
            </button>

            <button className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-xl bg-purple-400 
            px-6 font-semibold text-lg text-white duration-500 drop-shadow-xl cursor-pointer" onClick={() => navigate('/signup')}>
              <div className="translate-x-0 opacity-100 transition group-hover:-translate-x-[150%] group-hover:opacity-0">Join</div>
              <div className="absolute translate-x-[150%] opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6">
                <path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 
                7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 
                8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 
                7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path>
                </svg>
              </div>
            </button>

          </div>
        </div>

        {/* DNA Animation Section */}
        <div className="flex-1 flex justify-center">
          {/* For now use a placeholder SVG image */}
          <img src={spinny} alt='spinning DNA!' className="w-full h-full transform scale-125" />
        </div>
      </div>
    </div>

    <section className="bg-white py-20">
        <div className="container mx-auto px-6 text-center">
          
          {/* Headline */}
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Tired of a <span className="text-purple-400">Fragmented</span> Workflow?
          </h2>
          <p className="text-lg md:text-xl max-w-3xl mx-auto text-gray-600 mb-16">
            Constantly toggling between online tools like Expasy Translate and EMBOSS Needle is unproductive.
            SimpliSeq does the heavy lifting for you, combining six-frame translation and pairwise alignment to determine 
            the best-fit reference target protein for an input DNA sequence.
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            
            {/* Card 1: Automate */}
            <div className="feature-card">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-100 text-purple-600 mx-auto mb-5">
                {/* SVG Icon for Automation/Process */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M4 12h16m-5-8v5h5M20 20v-5h-5" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Convenient Workflow</h3>
              <p className="text-gray-600">
                No more exporting, reformatting, and importing data. Go from DNA to protein in one click.
              </p>
            </div>

            {/* Card 2: Accuracy */}
            <div className="feature-card">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-100 text-purple-600 mx-auto mb-5">
                {/* SVG Icon for Accuracy/Target */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Rapid Quality Control</h3>
              <p className="text-gray-600">
                Got back samples from sequencing? Instantly check your work and verify that your sequences resemble their intended protein targets!
              </p>
            </div>

            {/* Card 3: Speed */}
            <div className="feature-card">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-100 text-purple-600 mx-auto mb-5">
                {/* SVG Icon for Speed/Rocket */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Accelerate Your Research</h3>
              <p className="text-gray-600">
                Get to your answers fast and focus on what truly matters—your next discovery.
              </p>
            </div>
          </div>
        </div>
      </section>
      </>
  );
};

