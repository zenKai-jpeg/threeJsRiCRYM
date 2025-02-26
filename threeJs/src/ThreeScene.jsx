import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, OrthographicCamera, useGLTF } from '@react-three/drei';
import { EffectComposer, HueSaturation, BrightnessContrast, Bloom } from '@react-three/postprocessing';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper';
import * as THREE from 'three';
import materials from './materials.js';

// --- Utility Functions & Hooks ---

const useMaterialUpdater = (scene) => {
  useEffect(() => {
    if (!scene) return;

    scene.traverse(child => {
      if (child.isMesh && child.material && child.material.color) {
        const hex = child.material.color.getHexString();
        if (materials[hex]) {
          const settings = materials[hex];

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

          child.material = newMaterial;
          child.material.needsUpdate = true;
        }
      }
    });
  }, [scene]);
};

const useOrthographicCameraResize = () => {
  const { camera, gl } = useThree();
  useEffect(() => {
    if (!camera.isOrthographicCamera) return;

    const handleResize = () => {
      const zoomFactor = window.innerWidth / 1920; // Adjust zoom based on a baseline width (e.g., 1920px)
      camera.zoom = 100 * zoomFactor; // Baseline zoom

      camera.left = -window.innerWidth / 2;
      camera.right = window.innerWidth / 2;
      camera.top = window.innerHeight / 2;
      camera.bottom = -window.innerHeight / 2;

      camera.updateProjectionMatrix();
      gl.setSize(window.innerWidth, window.innerHeight);
    };

    handleResize(); // Initial resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [camera, gl]);
};

// --- Scene Container with Global Sway Animation ---
function SceneContainer({ children }) {
  const groupRef = useRef();
  
  // Set duration for one complete cycle (in seconds)
  const horizontalDuration = 5; // Horizontal sway completes in 5s
  const verticalDuration = 8;   // Vertical sway completes in 8s
  const rotationDuration = 5;  // Rotation completes in 10s

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const time = clock.getElapsedTime();
      
      // Horizontal motion (one full sine cycle every horizontalDuration)
      groupRef.current.position.x = Math.sin(time * (2 * Math.PI / horizontalDuration)) * 0.25;
      
      // Vertical motion (one full sine cycle every verticalDuration)
      groupRef.current.position.y = Math.sin(time * (2 * Math.PI / verticalDuration)) * 0.15;
      
      // Rotation (one full sine cycle every rotationDuration)
      groupRef.current.rotation.z = Math.sin(time * (2 * Math.PI / rotationDuration)) * 0.025;
    }
  });
  
  return <group ref={groupRef}>{children}</group>;
}

// --- Camera Position Controller ---
function CameraController() {
  const { camera } = useThree();
  
  useEffect(() => {
    // Set the initial camera position
    camera.position.set(5, 5, -3);
    camera.lookAt(2, 2, 0); // Look at the center of the scene
    camera.updateProjectionMatrix();
  }, [camera]);
  
  return null;
}

// --- Camera Resize Handler Component ---
function ResizeHandler() {
  useOrthographicCameraResize();
  return null; // This component doesn't render anything
}

const useFanAnimation = (fanRef) => {
  useFrame(({ clock }) => {
    if (fanRef.current) {
      fanRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 1) * (Math.PI / 4);
    }
  });
};

const useCeilingAnimation = (ceilingRef) => {
  useFrame(({ clock }) => {
    if (ceilingRef.current) {
      ceilingRef.current.rotation.y = clock.getElapsedTime() * -10;
    }
  });
};

const useCloudAnimation = (cloudRef) => {
  useFrame(({ clock }) => {
    if (cloudRef.current) {
      cloudRef.current.position.z = Math.sin(clock.getElapsedTime() * 0.15) * 20;
    }
  });
};

const useBirdAnimation = (birdRef, initialPosition, swayMagnitude) => {
  useFrame(({ clock }) => {
    if (birdRef.current && initialPosition) {
      const time = clock.getElapsedTime();
      birdRef.current.position.x = initialPosition[0] + Math.sin(time * 0.5) * swayMagnitude;
      birdRef.current.position.y = initialPosition[1] + Math.cos(time * 0.8) * swayMagnitude * 0.4;
      birdRef.current.position.z = initialPosition[2] + Math.sin(time * 0.5) * swayMagnitude * 0.2;
    }
  });
};


// --- Reusable Model Component ---
const Model = ({ path, onMeshClick, animation, ...props }) => {
  const { scene } = useGLTF(path);
  const modelRef = useRef();

  useMaterialUpdater(scene);

  // Apply animation hook if provided
  if (animation) {
    animation(modelRef);
  }

  return <primitive ref={modelRef} object={scene} {...props} onClick={onMeshClick} dispose={null} />;
};


// --- Light Components ---
const LightStrip = ({ start = -0.1, end = 2, step = 0.1, position = [1.15, 1.7] }) => {
  const points = useMemo(() => Array.from({ length: Math.ceil((end - start) / step) + 1 }, (_, i) => start + i * step), [start, end, step]);

  return (
    <>
      {points.map((z, index) => (
        <pointLight key={index} position={[...position, z]} intensity={0.2} color={'#ffa500'} />
      ))}
    </>
  );
};


// --- Main Scene Component ---
function ThreeScene() {
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef(null);
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const [isOverlayActive, setIsOverlayActive] = useState(true);
  const rectAreaLightRef = useRef();
  const [cameraPosition, setCameraPosition] = useState([5, 5, -3]);

  // YouTube Iframe API initialization
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


  // Overlay Visibility Effect
  useEffect(() => {
    if (!isOverlayActive) {
      const timeout = setTimeout(() => {
        setIsOverlayVisible(false);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [isOverlayActive]);


  const togglePlayback = () => {
    if (!playerRef.current) return;
    isPlaying ? playerRef.current.pauseVideo() : playerRef.current.playVideo();
    setIsPlaying(!isPlaying);
  };

  const handleMeshClick = (event) => {
    event.stopPropagation();
    // const mesh = event.object;
  };

  const handleOverlayClick = () => {
    setIsOverlayActive(false);
    if (!isPlaying) {
      togglePlayback();
    }
  };

  // Camera position handlers
  const handleCameraPosition1 = () => {
    setCameraPosition([5, 5, -3]);  // Default view
  };

  const handleCameraPosition2 = () => {
    setCameraPosition([7, 3, 0]);  // Side view
  };

  const handleCameraPosition3 = () => {
    setCameraPosition([2, 8, -2]);  // Top view
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

      {/* Camera position buttons */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <button
          onClick={handleCameraPosition1}
          style={{
            padding: '8px 15px',
            background: 'rgba(0, 0, 0, 0.18)',
            color: 'white',
            border: 'none',
            borderRadius: '25px',
            cursor: 'pointer',
            fontSize: '10px',
            outline: 'none',
          }}
        >
          FRONT
        </button>
        <button
          onClick={handleCameraPosition2}
          style={{
            padding: '8px 15px',
            background: 'rgba(0, 0, 0, 0.18)',
            color: 'white',
            border: 'none',
            borderRadius: '25px',
            cursor: 'pointer',
            fontSize: '10px',
            outline: 'none',
          }}
        >
          SIDE
        </button>
        <button
          onClick={handleCameraPosition3}
          style={{
            padding: '8px 15px',
            background: 'rgba(0, 0, 0, 0.18)',
            color: 'white',
            border: 'none',
            borderRadius: '25px',
            cursor: 'pointer',
            fontSize: '10px',
            outline: 'none',
          }}
        >
          TOP
        </button>
      </div>

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
          outline: 'none',
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
        camera={{ position: cameraPosition, zoom: 100 }}
      >
        {/* Camera */}
        <ResizeHandler />
        <CameraController />
        <OrthographicCamera makeDefault near={-1000} far={1000} position={cameraPosition} />

        {/* Cloud is outside of SceneContainer so it doesn't sway with the rest */}
        <Model path="/cloud.glb" position={[0, 0, 0]} scale={1} onMeshClick={handleMeshClick} animation={useCloudAnimation} />

        {/* All other models inside SceneContainer for collective sway */}
        <SceneContainer>
          <Model path="/static.glb" position={[0, 0, 0]} onMeshClick={handleMeshClick} />
          <Model path="/fan.glb" position={[1.325, 1.025, 1.64]} onMeshClick={handleMeshClick} animation={useFanAnimation} />
          <Model path="/ceiling.glb" position={[2.04, 5.17, -0.247]} scale={[3.7, 3.7, 3.7]} onMeshClick={handleMeshClick} animation={useCeilingAnimation} />
          <Model path="/bird.glb" position={[0.2, 3, -3.5]} scale={[0.5, 0.5, 0.5]} onMeshClick={handleMeshClick} animation={(ref) => useBirdAnimation(ref, [0.2, 3, -3.5], 1)} />
          <Model path="/dynamic.glb" position={[0, 0, 0]} onMeshClick={handleMeshClick} />

          {/* Lighting */}
          <ambientLight intensity={0.25} />
          <directionalLight position={[0, 20, 0]} intensity={0.25} />
          <LightStrip />
          
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
            width={2.3}
            height={0.05}
            color={'#ffa500'}
            intensity={25}
            position={[2.7, 0.49, 1.05]}
            rotation={[Math.PI / 2, Math.PI / 1, Math.PI / 1]}
          />
          {rectAreaLightRef.current && (
            <primitive object={new RectAreaLightHelper(rectAreaLightRef.current)} dispose={null} />
          )}
        </SceneContainer>

        <Environment preset="sunset" />

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
    </>
  );
}

export default ThreeScene;
