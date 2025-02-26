import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, OrthographicCamera, useGLTF } from '@react-three/drei';
import { EffectComposer, HueSaturation, BrightnessContrast, Bloom } from '@react-three/postprocessing';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper';
import * as THREE from 'three';
import materials from './materials.js';

function updateMaterialProperties(scene) {
  scene.traverse(child => {
    if (child.isMesh && child.material && child.material.color) {
      const hex = child.material.color.getHexString();
      if (materials[hex]) {
        const settings = materials[hex];
        
        // Create new material with environment map
        const newMaterial = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(settings.color),
          metalness: settings.metalness,
          roughness: settings.roughness,
          specularIntensity: settings.specularIntensity,
          clearcoat: settings.clearcoat,
          clearcoatRoughness: settings.clearcoatRoughness,
          sheen: settings.sheen,
          envMapIntensity: settings.envMapIntensity || 1,
          iridescence: settings.iridescence,
          emissive: new THREE.Color(settings.emissive),
          emissiveIntensity: settings.emissiveIntensity,
          transmission: settings.transmission,
          transparent: settings.transparent,
          thickness: settings.thickness,
          attenuationColor: new THREE.Color(settings.attenuationColor),
          attenuationDistance: settings.attenuationDistance,
          opacity: settings.opacity,
          ior: settings.ior,
          reflectivity: settings.reflectivity,
          iridescenceIOR: settings.iridescenceIOR,
          side: settings.side,
          wireframe: settings.wireframe,
          flatShading: settings.flatShading,
        });

        // Replace material and force update
        child.material = newMaterial;
        child.material.needsUpdate = true;
      }
    }
  });
}

function ResizeHandler() {
  const { camera, gl } = useThree()
  useEffect(() => {
    const baselineZoom = 100
    const baselineWidth = window.innerWidth
    const handleResize = () => {
      if (camera.isOrthographicCamera) {
        camera.left = -window.innerWidth / 2
        camera.right = window.innerWidth / 2
        camera.top = window.innerHeight / 2
        camera.bottom = -window.innerHeight / 2
      }
      camera.zoom = baselineZoom * (window.innerWidth / baselineWidth)
      camera.updateProjectionMatrix()
      gl.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [camera, gl])
  return null
}

// function MaterialInspector({ material }) {
//   if (!material) return null
//   return (
//     <div
//       style={{
//         position: 'absolute',
//         top: 10,
//         right: 10,
//         background: 'rgba(0, 0, 0, 0.9)',
//         padding: '10px',
//         borderRadius: '4px',
//         fontSize: '12px',
//         maxWidth: '200px',
//         overflow: 'auto',
//         color: '#fff',
//       }}
//     >
//       {material.color && (
//         <div>
//           <strong>Color:</strong> #{material.color.getHexString()}
//         </div>
//       )}
//     </div>
//   )
// }

function StaticModel({ onMeshClick, ...props }) {
  const { scene } = useGLTF('/static.glb')
  useEffect(() => {
    updateMaterialProperties(scene)
  }, [scene])
  return <primitive object={scene} {...props} onClick={onMeshClick} />
}

function FanModel({ onMeshClick, ...props }) {
  const { scene } = useGLTF('/fan.glb');
  const fanRef = useRef(); // Reference for animation
  const speed = 1; // Speed of animation

  useEffect(() => {
    updateMaterialProperties(scene);
  }, [scene]);

  useFrame(({ clock }) => {
    if (fanRef.current) {
      // Swiveling motion using sine wave
      fanRef.current.rotation.y = Math.sin(clock.getElapsedTime() * speed) * (Math.PI / 4); 
    }
  });

  return <primitive ref={fanRef} object={scene} {...props} onClick={onMeshClick} />;
}

function CeilingModel({ onMeshClick, ...props }) {
  const { scene } = useGLTF('/ceiling.glb');
  const ceilingRef = useRef(); // Reference for animation
  const speed = -10; // Speed of animation

  useEffect(() => {
    updateMaterialProperties(scene);
  }, [scene]);

  useFrame(({ clock }) => {
    if (ceilingRef.current) {
      // Rotate the ceiling model around the Y-axis
      ceilingRef.current.rotation.y = clock.getElapsedTime() * speed;
    }
  });

  return <primitive ref={ceilingRef} object={scene} {...props} onClick={onMeshClick} />;
}

function CloudModel({ onMeshClick, ...props }) {
  const { scene } = useGLTF('/cloud.glb');
  const cloudRef = useRef();
  const speed = 0.15; // Animation speed
  const amplitude = 20; // How far it moves left/right

  useEffect(() => {
    updateMaterialProperties(scene);
  }, [scene]);

  useFrame(({ clock }) => {
    if (cloudRef.current) {
      // Alternate position using sine wave
      cloudRef.current.position.z = Math.sin(clock.getElapsedTime() * speed) * amplitude;
    }
  });

  return <primitive ref={cloudRef} object={scene} {...props} onClick={onMeshClick} />;
}

function BirdModel({ onMeshClick, swayMagnitude = 1, ...props }) {
  const { scene } = useGLTF('/bird.glb');
  const birdRef = useRef();

  useEffect(() => {
    updateMaterialProperties(scene);
  }, [scene]);

  useFrame(({ clock }) => {
    if (birdRef.current) {
      const time = clock.getElapsedTime();
      // Apply sway relative to the initial position
      birdRef.current.position.x = props.position[0] + Math.sin(time * 0.5) * swayMagnitude;
      birdRef.current.position.y = props.position[1] + Math.cos(time * 0.8) * swayMagnitude * 0.4;
      birdRef.current.position.z = props.position[2] + Math.sin(time * 0.5) * swayMagnitude * 0.2;
    }
  });

  return <primitive ref={birdRef} object={scene} {...props} onClick={onMeshClick} />;
}

function DynamicModel({ onMeshClick, ...props }) {
  const { scene } = useGLTF('/dynamic.glb')
  useEffect(() => {
    updateMaterialProperties(scene)
  }, [scene])
  return <primitive object={scene} {...props} onClick={onMeshClick} />
}

function LightStrip({ start = -0.1, end = 2, step = 0.1, position = [1.15, 1.7] }) {
  const points = Array.from({ length: Math.ceil((end - start) / step) + 1 }, (_, i) => start + i * step)

  return points.map((z, index) => (
    <pointLight key={index} position={[...position, z]} intensity={0.2} color={'#ffa500'} />
  ))
}

function ThreeScene() {
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const rectAreaLightRef = useRef();
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef(null);
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const [isOverlayActive, setIsOverlayActive] = useState(true);

  useEffect(() => {
    if (!isOverlayActive) {
      const timeout = setTimeout(() => {
        setIsOverlayVisible(false);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [isOverlayActive]);

  useEffect(() => {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player('youtube-player', {
        height: '0',
        width: '0',
        videoId: '5qap5aO4i9A',
        playerVars: {
          autoplay: 0,
          loop: 1,
          controls: 0,
          modestbranding: 1,
          playlist: '7NOSDKb0HlU'
        }
      });
    };
  }, []);

  const togglePlayback = () => {
    if (!playerRef.current) return;
    
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
    setIsPlaying(!isPlaying);
  };

  const handleMeshClick = (event) => {
    event.stopPropagation();
    const mesh = event.object;
    setSelectedMaterial(mesh.material);
  };

  const handleOverlayClick = () => {
    setIsOverlayActive(false);
    if (!isPlaying) {
      togglePlayback();
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          @keyframes fadeIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
        `}
      </style>

      {/* Initial Overlay */}
      {isOverlayVisible && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.99)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: isOverlayActive ? 1 : 0,
            pointerEvents: isOverlayActive ? 'auto' : 'none',
            transition: 'opacity 0.5s ease-in-out',
            zIndex: 1001,
          }}
          onClick={handleOverlayClick}
        >
          <div style={{
            width: '800px',
            height: '800px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <img 
              src="/splash.png" 
              alt="My Little World"
              style={{
                width: '100%',
                height: '100%',
                maxWidth: '800px',
                maxHeight: '800px',
                objectFit: 'contain',
                padding: '20px',
                filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3))',
                opacity: 0,
                animation: 'fadeIn 2s ease-in 2s forwards, pulse 4s infinite 2s'
              }}
            />
          </div>
        </div>
      )}

      <div id="youtube-player" style={{ display: 'none' }}></div>

      <button 
        onClick={togglePlayback}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          padding: '10px 20px',
          background: 'rgba(0, 0, 0, 0.18)',
          color: 'white',
          border: 'none',
          borderRadius: '25px',
          cursor: 'pointer',
          fontSize: '10px',
          transition: 'all 0.3s ease',
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none',
        }}
      >
        {isPlaying ? 'P A U S E' : 'P L A Y'}
      </button>
      
      <Canvas
        gl={{
          physicallyCorrectLights: true,
          outputEncoding: THREE.sRGBEncoding,
        }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#9CB9E7',
        }}
      >
        {/* Camera */}
        <ResizeHandler />
        <OrthographicCamera
          makeDefault
          left={-window.innerWidth / 2}
          right={window.innerWidth / 2}
          top={window.innerHeight / 2}
          bottom={-window.innerHeight / 2}
          near={-1000}
          far={1000}
          position={[5, 5, -3]}
          zoom={100}
        />

        {/* Scene Contents */}
        <StaticModel position={[0, 0, 0]} onMeshClick={handleMeshClick} />
        <FanModel position={[1.325, 1.025, 1.64]} onMeshClick={handleMeshClick} />
        <CeilingModel position={[2.04, 5.17, -0.247]} scale={[3.7, 3.7, 3.7]} onMeshClick={handleMeshClick} />
        <CloudModel position={[0, 0, 0]} scale={1} onMeshClick={handleMeshClick} />
        <BirdModel position={[0.2, 3, -3.5]} scale={[0.5, 0.5, 0.5]} swayMagnitude={1} onMeshClick={handleMeshClick} />
        <DynamicModel position={[0, 0, 0]} onMeshClick={handleMeshClick} />

        {/* Lighting */}
        <ambientLight intensity={0.25} />
        <directionalLight position={[0, 20, 0]} intensity={0.25} />
        <LightStrip />
        <Environment preset="sunset" />

        {/* Monitor Lights */}
        <pointLight position={[1.5, 1.3, 0]} intensity={0.5} color={'#8fbddb'} />
        <pointLight position={[1.5, 1.3, .5]} intensity={1} color={'#8fbddb'} />

        {/* Area Lights */}
        <rectAreaLight
          ref={rectAreaLightRef}
          width={2.3}
          height={0.2}
          color={'#ffa500'}
          intensity={25}
          position={[1.2, 1.65, 1.05]}
          rotation={[Math.PI / 2, Math.PI / 1, Math.PI / 2]}
        />
        <rectAreaLight
          ref={rectAreaLightRef}
          width={2.3}
          height={0.05}
          color={'#ffa500'}
          intensity={25}
          position={[2.7, 0.49, 1.05]}
          rotation={[Math.PI / 2, Math.PI / 1, Math.PI / 1]}
        />
        {rectAreaLightRef.current && (
          <primitive object={new RectAreaLightHelper(rectAreaLightRef.current)} />
        )}

        {/* Controls */}
        <OrbitControls
          target={[2, 2, 0]}
          minPolarAngle={Math.PI / 12}
          maxPolarAngle={Math.PI / 2.25}
        />

        {/* Post Processing */}
        <EffectComposer>
          <HueSaturation hue={-0.2} saturation={0.35} />
          <BrightnessContrast brightness={-0.2} contrast={0.2} />
          <Bloom
            intensity={0.4}
            luminanceThreshold={5}
            luminanceSmoothing={0.025}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>

      {/* <MaterialInspector material={selectedMaterial} /> */}
    </>
  );
}

export default ThreeScene;