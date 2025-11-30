import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ScrollControls, useScroll, Text, Float, Image, RoundedBox, useCursor } from '@react-three/drei';

// --- CẤU HÌNH ---
// Hàm xử lý link ảnh an toàn (cho bảng demo)
const getSafeImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith('/')) return url;
  return `https://corsproxy.io/?${encodeURIComponent(url)}`;
};

// --- DANH SÁCH STICKER (DÙNG LINK ẢNH TRỰC TIẾP TỪ CDN - AN TOÀN & ĐẸP) ---
// Sử dụng bộ Twemoji qua CDN để đảm bảo không lỗi CORS và luôn hiển thị đẹp
const STICKER_URLS = [
  "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2b50.png", // Ngôi sao
  "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2764.png", // Trái tim đỏ
  "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f680.png", // Tên lửa
  "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f389.png", // Pháo giấy
  "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f60d.png", // Mắt trái tim
  "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4af.png", // 100 điểm
  "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f308.png", // Cầu vồng
  "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f340.png", // Cỏ 4 lá
  "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f984.png", // Kỳ lân
];

const NOTE_COLORS = ["#fef08a", "#bfdbfe", "#fecaca", "#e9d5ff", "#bbf7d0"];

// --- CẤU HÌNH DỮ LIỆU TƯỜNG ---
const WALL_ITEMS = [
  {
    position: [-4, 2, -2], 
    rotation: [0, Math.PI / 3, 0],
    type: 'text',
    title: "EmoMap",
    desc: "Người bạn AI thấu cảm",
  },
  {
    position: [4, 2, -6], 
    rotation: [0, -Math.PI / 3, 0],
    type: 'text',
    title: "Emo luôn",
    desc: "Lắng nghe & sẻ chia",
  },
  {
    position: [-4, 2, -10], 
    rotation: [0, Math.PI / 3, 0],
    type: 'image',
    title: "Giao diện Chat",
    // Link ảnh demo (Dùng Unsplash cho an toàn)
    imgUrl: "/anh4.png" 
  },
  {
    position: [4, 2, -14], 
    rotation: [0, -Math.PI / 3, 0],
    type: 'image',
    title: "Note cute",
    imgUrl: "/anh1.png"
  },
  {
    position: [-4, 2, -18], 
    rotation: [0, Math.PI / 3, 0],
    type: 'image',
    title: "Trang Quản Trị",
    desc: "Dành cho giáo viên",
    imgUrl: "/anh2.png" 
  },
  {
    position: [4, 2, -22], 
    rotation: [0, -Math.PI / 3, 0],
    type: 'image',
    title: "Lời Khuyên AI",
    desc: "Phản hồi sâu sắc",
    imgUrl: "/anh3.png" 
  },
  {
    position: [-4, 2, -26], 
    rotation: [0, Math.PI / 3, 0],
    type: 'text',
    title: "Bảo mật",
    desc: "An toàn tuyệt đối",
  }
];

// --- COMPONENT: BẢNG GHIM (CORK BOARD) ---
const PinBoard = ({ item }) => {
  const [hovered, setHover] = useState(false);
  useCursor(hovered); 
  const [clicked, setClicked] = useState(false);

  // Tạo dữ liệu ngẫu nhiên cho mỗi bảng
  const randomData = useMemo(() => {
    const noteColor = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
    
    // --- LOGIC MỚI: CHỈ ĐẶT STICKER Ở 4 GÓC ---
    // Kích thước bảng khoảng 3.2 x 2.2
    // Kích thước nội dung (giấy/ảnh) khoảng 2.5 x 1.5 hoặc 2.8 x 1.8
    // -> Sticker nên đặt ở x > 1.3 hoặc x < -1.3, y > 0.8 hoặc y < -0.8
    const corners = [
      { x: -1.4, y: 0.9 }, // Góc trên trái
      { x: 1.4, y: 0.9 },  // Góc trên phải
      { x: -1.4, y: -0.9 }, // Góc dưới trái
      { x: 1.4, y: -0.9 },  // Góc dưới phải
    ];

    // Trộn ngẫu nhiên các góc
    const shuffledCorners = corners.sort(() => 0.5 - Math.random());
    
    // Chọn 2 hoặc 3 sticker ngẫu nhiên
    const numStickers = Math.floor(Math.random() * 2) + 2; 
    const selectedCorners = shuffledCorners.slice(0, numStickers);

    const stickers = selectedCorners.map(corner => ({
      url: STICKER_URLS[Math.floor(Math.random() * STICKER_URLS.length)],
      // Thêm chút lệch ngẫu nhiên nhỏ để trông tự nhiên hơn
      x: corner.x + (Math.random() - 0.5) * 0.1, 
      y: corner.y + (Math.random() - 0.5) * 0.1,
      rot: (Math.random() - 0.5) * 0.5 
    }));
    
    return { noteColor, stickers };
  }, []);

  return (
    <group 
      position={item.position} 
      rotation={item.rotation}
      onClick={() => setClicked(!clicked)}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
      scale={clicked ? 1.2 : 1}
    >
      {/* Khung gỗ */}
      <RoundedBox args={[3.2, 2.2, 0.1]} radius={0.05} smoothness={4}>
        <meshStandardMaterial color="#5d4037" roughness={0.6} />
      </RoundedBox>
      
      {/* Mặt bảng bần */}
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[3, 2, 0.02]} />
        <meshStandardMaterial color="#d2b48c" map={null} roughness={0.8} /> 
      </mesh>

      {/* CÁC STICKER DẠNG ẢNH - Đặt ở các góc */}
      {randomData.stickers.map((sticker, idx) => (
        <Image
          key={idx}
          url={sticker.url}
          scale={[0.4, 0.4]} 
          // Z = 0.15 để cao hơn mặt bảng và nội dung
          position={[sticker.x, sticker.y, 0.15]} 
          rotation={[0, 0, sticker.rot]}
          transparent
          opacity={0.95}
          toneMapped={false} 
        />
      ))}

      {/* Nội dung chính */}
      {item.type === 'text' ? (
        <group position={[0, 0, 0.08]}>
          {/* Giấy Note */}
          <mesh position={[0, 0, 0]} rotation={[0, 0, 0.05]}>
            <planeGeometry args={[2.5, 1.5]} />
            <meshStandardMaterial color={randomData.noteColor} roughness={0.5} />
          </mesh>
          {/* Đinh ghim */}
          <mesh position={[0, 0.65, 0.02]}>
            <sphereGeometry args={[0.08]} />
            <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.2} />
          </mesh>
          
          <Text
            position={[0, 0.2, 0.01]}
            fontSize={0.35}
            color="#1f2937"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            {item.title}
          </Text>
          <Text
            position={[0, -0.3, 0.01]}
            fontSize={0.18}
            color="#4b5563"
            anchorX="center"
            anchorY="middle"
            maxWidth={2.3}
          >
            {item.desc}
          </Text>
        </group>
      ) : (
        <group position={[0, 0, 0.08]}>
          {/* Ảnh Demo */}
          <Image 
            url={item.imgUrl} 
            scale={[2.8, 1.8]} 
            position={[0, 0, 0.01]}
            transparent 
            opacity={hovered ? 1 : 0.9} 
          />
          <Text
            position={[0, -1.3, 0]}
            fontSize={0.2}
            color="#1f2937"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            {item.title}
          </Text>
           {item.desc && (
             <Text
                position={[0, -1.6, 0]}
                fontSize={0.15}
                color="#4b5563"
                anchorX="center"
                anchorY="middle"
             >
               {item.desc}
             </Text>
           )}
        </group>
      )}
    </group>
  );
};
// --- COMPONENT: BÀN HỌC ---
const Desk = ({ position, rotationY = 0 }) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <RoundedBox args={[1.4, 0.08, 0.7]} radius={0.02} smoothness={4} position={[0, 0.75, 0]}>
        <meshStandardMaterial color="#eecfa1" />
      </RoundedBox>
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[1.3, 0.15, 0.6]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      <mesh position={[-0.6, 0.35, -0.3]}>
        <cylinderGeometry args={[0.03, 0.03, 0.7]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0.6, 0.35, -0.3]}>
        <cylinderGeometry args={[0.03, 0.03, 0.7]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[-0.6, 0.35, 0.3]}>
        <cylinderGeometry args={[0.03, 0.03, 0.7]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0.6, 0.35, 0.3]}>
        <cylinderGeometry args={[0.03, 0.03, 0.7]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      
      <group position={[0, 0, 0.5]}>
         <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[0.4, 0.05, 0.4]} />
            <meshStandardMaterial color="#555" />
         </mesh>
         <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.4]} />
            <meshStandardMaterial color="#333" />
         </mesh>
         <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.05]} />
            <meshStandardMaterial color="#333" />
         </mesh>
      </group>
    </group>
  )
}

// --- COMPONENT: CỬA RA VÀO ---
const EndDoor = () => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  return (
    <group position={[0, 0, -32]}> 
      <mesh position={[0, 2, -0.1]}>
        <planeGeometry args={[10, 4]} />
        <meshStandardMaterial color="#fef3c7" />
      </mesh>

      <mesh position={[0, 1.6, 0.05]}>
        <boxGeometry args={[2.4, 3.2, 0.1]} />
        <meshStandardMaterial color="#3e2723" />
      </mesh>
      
      <mesh 
        position={[0, 1.6, 0.1]}
        onClick={() => navigate('/student')}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[2.2, 3, 0.05]} />
        <meshStandardMaterial 
          color={hovered ? "#4ade80" : "#60a5fa"} 
          roughness={0.2}
        />
      </mesh>

      <mesh position={[0.9, 1.6, 0.15]}>
        <sphereGeometry args={[0.08]} />
        <meshStandardMaterial color="gold" metalness={0.8} roughness={0.1} />
      </mesh>

      <group position={[0, 3.4, 0.1]}>
        <mesh>
          <boxGeometry args={[3, 0.6, 0.05]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <Text
          position={[0, 0, 0.06]}
          fontSize={0.25}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          Trò chuyện với Emo nào
        </Text>
      </group>
    </group>
  );
};

// --- SCENE CHÍNH ---
const ClassroomScene = () => {
  const scroll = useScroll();
  const { camera, gl } = useThree();

  gl.shadowMap.enabled = true;

  useFrame((state, delta) => {
    const targetZ = -scroll.offset * 28; 
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.08);
    
    const lookX = -state.pointer.x * 0.8; 
    const lookY = state.pointer.y * 0.3;  
    
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, lookX, 0.05);
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, lookY, 0.05);

    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.7 + Math.sin(state.clock.elapsedTime * 6) * 0.02, 0.1);
  });

  return (
    <>
      <color attach="background" args={['#dbeafe']} /> 
      <fog attach="fog" args={['#dbeafe', 5, 35]} />
      
      <ambientLight intensity={0.7} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[0, 4, -10]} intensity={0.5} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -18]} receiveShadow>
        <planeGeometry args={[12, 80]} />
        <meshStandardMaterial color="#deb887" /> 
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4.5, -18]}>
        <planeGeometry args={[12, 80]} />
        <meshStandardMaterial color="#f3f4f6" />
      </mesh>

      <mesh position={[-6, 2.25, -18]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[80, 4.5]} />
        <meshStandardMaterial color="#fffbeb" />
      </mesh>

      <mesh position={[6, 2.25, -18]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[80, 4.5]} />
        <meshStandardMaterial color="#fffbeb" />
      </mesh>

      <mesh position={[-5.9, 0.2, -18]} rotation={[0, Math.PI / 2, 0]}>
         <boxGeometry args={[80, 0.4, 0.1]} />
         <meshStandardMaterial color="#8b4513" />
      </mesh>
      <mesh position={[5.9, 0.2, -18]} rotation={[0, -Math.PI / 2, 0]}>
         <boxGeometry args={[80, 0.4, 0.1]} />
         <meshStandardMaterial color="#8b4513" />
      </mesh>

      {[0, -8, -16, -24, -32].map((z, i) => (
        <group key={i}>
           <mesh position={[-5.9, 2.5, z]} rotation={[0, Math.PI / 2, 0]}>
             <planeGeometry args={[3, 2]} />
             <meshBasicMaterial color="#bae6fd" />
           </mesh>
           <mesh position={[5.9, 2.5, z]} rotation={[0, -Math.PI / 2, 0]}>
             <planeGeometry args={[3, 2]} />
             <meshBasicMaterial color="#bae6fd" />
           </mesh>
        </group>
      ))}

      {[-3, -8, -13, -18, -23].map((z, i) => (
        <React.Fragment key={i}>
          <Desk position={[-2.5, 0, z]} rotationY={0.2} />
          <Desk position={[2.5, 0, z]} rotationY={-0.2} />
        </React.Fragment>
      ))}

      {WALL_ITEMS.map((item, idx) => (
        <PinBoard key={idx} item={item} />
      ))}

      <EndDoor />

    </>
  );
};

// --- MAIN COMPONENT ---
const LandingPage3D = () => {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#dbeafe' }}>
      <Canvas camera={{ position: [0, 1.7, 5], fov: 60 }} shadows>
        <ScrollControls pages={6} damping={0.3}>
          <ClassroomScene />
        </ScrollControls>
      </Canvas>
      
      <div style={{
        position: 'absolute', 
        bottom: 30, 
        left: '50%', 
        transform: 'translateX(-50%)',
        textAlign: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.8)',
          padding: '12px 24px',
          borderRadius: '30px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '5px'
        }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#4b5563', fontWeight: 'bold' }}>
            DI CHUỘT ĐỂ NHÌN XUNG QUANH
          </p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
            (Cuộn chuột để di chuyển • Click vào bảng để xem gần)
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage3D;