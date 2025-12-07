import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ScrollControls, useScroll, Text, Float, Image, RoundedBox, useCursor, Html } from '@react-three/drei';
import { ArrowUp, ArrowDown, Eye, ChevronLeft, ChevronRight } from 'lucide-react';


// --- 1. CẤU HÌNH & HELPER ---

// Hàm xử lý link ảnh an toàn (tránh lỗi CORS)
const getSafeImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith('/')) return url;
  // Sử dụng proxy nếu cần, hoặc trả về trực tiếp nếu nguồn ảnh hỗ trợ CORS (như Unsplash/Twemoji)
  return `https://corsproxy.io/?${encodeURIComponent(url)}`;
};

// Hook kiểm tra thiết bị Mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
}

// Danh sách Sticker (Twemoji CDN - An toàn, Đẹp, Không lỗi)
const STICKER_URLS = [
  "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2b50.png", // Ngôi sao
  "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2764.png", // Trái tim
  "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f680.png", // Tên lửa
  "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f525.png", // Lửa
  "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f389.png", // Pháo giấy
  "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f60d.png", // Mắt trái tim
  "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4af.png", // 100 điểm
  "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f308.png", // Cầu vồng
  "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f340.png", // Cỏ 4 lá
  "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f984.png", // Kỳ lân
];

const NOTE_COLORS = ["#fef08a", "#bfdbfe", "#fecaca", "#e9d5ff", "#bbf7d0"];

// Dữ liệu các bảng trên tường (Vị trí X sẽ được tính toán lại theo mobile/desktop)
const BASE_WALL_ITEMS = [
  { z: -2, side: 'left', type: 'text', title: "EmoMap", desc: "Người bạn AI thấu cảm" },
  { z: -6, side: 'right', type: 'text', title: "Emo luôn ở đây", desc: "Lắng nghe & sẻ chia" },
  { z: -10, side: 'left', type: 'image', title: "Giao diện Chat", imgUrl: "/demo-chat.png" },
  { z: -14, side: 'right', type: 'image', title: "Tường Ẩn Danh", imgUrl: "/demo-wall.png" },
  { z: -18, side: 'left', type: 'image', title: "Trang Quản Trị", desc: "Dành cho giáo viên", imgUrl: "/demo-admin.png" },
  { z: -22, side: 'right', type: 'image', title: "Lời Khuyên AI", desc: "Phản hồi sâu sắc", imgUrl: "/demo-survey.png" },
  { z: -26, side: 'left', type: 'text', title: "Bảo Mật", desc: "An toàn tuyệt đối" }
];

// --- 2. CÁC COMPONENTS CON ---


// --- COMPONENT NGOÀI CANVAS: GIAO DIỆN ĐIỀU KHIỂN MOBILE ---
const MobileControlsOverlay = ({ scrollRef, viewOffsetRef }) => {
  const intervalRef = useRef(null);

  // Hàm xử lý khi nhấn giữ nút di chuyển (scroll)
  const startMoving = (direction) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (scrollRef.current && scrollRef.current.el) {
        const speed = window.innerHeight * 0.02; 
        if (direction === 'forward') {
          scrollRef.current.el.scrollTop += speed;
        } else {
          scrollRef.current.el.scrollTop -= speed;
        }
      }
    }, 16); 
  };

  // Hàm xử lý khi nhấn giữ nút xoay (rotate)
  const startRotating = (direction) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      // Mỗi lần lặp cộng thêm 1 chút góc xoay
      const rotationSpeed = 0.05; 
      viewOffsetRef.current += (direction === 'left' ? rotationSpeed : -rotationSpeed);
    }, 16);
  };

  const stopAction = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  return (
    <div style={{
      position: 'fixed', bottom: '20px', left: 0, right: 0, 
      padding: '0 20px', display: 'flex', justifyContent: 'space-between', 
      alignItems: 'flex-end', zIndex: 999999, pointerEvents: 'none'
    }}>
      
      {/* Cụm nút QUAN SÁT (Trái - Phải) */}
      <div style={{ display: 'flex', gap: '15px', pointerEvents: 'auto' }}>
        <button 
          onPointerDown={() => startRotating('left')}
          onPointerUp={stopAction}
          onPointerLeave={stopAction}
          style={btnStyle}
        ><ChevronLeft size={32} /></button>
        
        <div style={{ ...btnStyle, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none' }}><Eye size={24} /></div>

        <button 
          onPointerDown={() => startRotating('right')}
          onPointerUp={stopAction}
          onPointerLeave={stopAction}
          style={btnStyle}
        ><ChevronRight size={32} /></button>
      </div>

      {/* Cụm nút DI CHUYỂN (Tiến - Lùi) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', pointerEvents: 'auto' }}>
        <button 
          onPointerDown={() => startMoving('forward')}
          onPointerUp={stopAction}
          onPointerLeave={stopAction}
          style={{ ...btnStyle, background: 'rgba(255,255,255,0.9)' }}
        ><ArrowUp size={32} /></button>
        
        <button 
          onPointerDown={() => startMoving('backward')}
          onPointerUp={stopAction}
          onPointerLeave={stopAction}
          style={{ ...btnStyle, background: 'rgba(255,255,255,0.9)' }}
        ><ArrowDown size={32} /></button>
      </div>
    </div>
  );
};


const btnStyle = {
  width: '60px', height: '60px', borderRadius: '50%', border: 'none',
  background: 'rgba(255,255,255,0.8)', boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#333', cursor: 'pointer', touchAction: 'none', select: 'none'
};
// Bảng Ghim (Cork Board)
const PinBoard = ({ item, isMobile }) => {
  const [hovered, setHover] = useState(false);
  useCursor(hovered); 
  const [clicked, setClicked] = useState(false);

  // Scale nhỏ hơn chút trên mobile
  const scaleBase = isMobile ? 0.85 : 1; 
  const finalScale = clicked ? scaleBase * 1.15 : scaleBase;

  // Tạo dữ liệu ngẫu nhiên (Chạy 1 lần duy nhất)
  const randomData = useMemo(() => {
    const noteColor = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
    
    // --- LOGIC ĐẶT STICKER Ở 4 GÓC (Tránh che nội dung) ---
    const corners = [
      { x: -1.3, y: 0.8 },  // Góc trên trái
      { x: 1.3, y: 0.8 },   // Góc trên phải
      { x: -1.3, y: -0.8 }, // Góc dưới trái
      { x: 1.3, y: -0.8 },  // Góc dưới phải
    ];
    // Trộn ngẫu nhiên các góc
    const shuffledCorners = corners.sort(() => 0.5 - Math.random());
    // Lấy 2 hoặc 3 góc để dán
    const numStickers = Math.floor(Math.random() * 2) + 2; 
    const selectedCorners = shuffledCorners.slice(0, numStickers);

    const stickers = selectedCorners.map(corner => ({
      url: STICKER_URLS[Math.floor(Math.random() * STICKER_URLS.length)],
      // Thêm chút lệch ngẫu nhiên nhỏ cho tự nhiên
      x: corner.x + (Math.random() - 0.5) * 0.15, 
      y: corner.y + (Math.random() - 0.5) * 0.15,
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
      scale={finalScale}
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

      {/* Stickers (Dùng Image Mesh để dính chặt vào bảng) */}
      {randomData.stickers.map((sticker, idx) => (
        <Image
          key={idx}
          url={sticker.url} // Không cần proxy vì CDN này cho phép CORS
          scale={[0.4, 0.4]} 
          // Z = 0.15: Cao hơn mặt bảng (0.06) và giấy note (0.08) -> KHÔNG NHẤP NHÁY
          position={[sticker.x, sticker.y, 0.15]} 
          rotation={[0, 0, sticker.rot]}
          transparent
          opacity={0.95}
          toneMapped={false} // Giữ màu gốc rực rỡ
        />
      ))}

      {/* Nội dung Chính */}
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
          <Text position={[0, 0.2, 0.01]} fontSize={0.35} color="#1f2937" anchorX="center" anchorY="middle" fontWeight="bold">
            {item.title}
          </Text>
          <Text position={[0, -0.3, 0.01]} fontSize={0.18} color="#4b5563" anchorX="center" anchorY="middle" maxWidth={2.3}>
            {item.desc}
          </Text>
        </group>
      ) : (
        <group position={[0, 0, 0.08]}>
          {/* Ảnh Demo */}
          <Image 
            url={item.imgUrl} // Nếu dùng ảnh local thì sửa trong mảng data
            scale={[2.8, 1.8]} 
            position={[0, 0, 0.01]}
            transparent 
            opacity={hovered ? 1 : 0.95} 
          />
          <Text position={[0, -1.3, 0]} fontSize={0.2} color="#1f2937" anchorX="center" anchorY="middle" fontWeight="bold">
            {item.title}
          </Text>
           {item.desc && <Text position={[0, -1.6, 0]} fontSize={0.15} color="#4b5563" anchorX="center" anchorY="middle">{item.desc}</Text>}
        </group>
      )}
    </group>
  );
};

// Bàn học (Desk)
const Desk = ({ position, rotationY = 0, scale = 1 }) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <RoundedBox args={[1.4, 0.08, 0.7]} radius={0.02} smoothness={4} position={[0, 0.75, 0]}>
        <meshStandardMaterial color="#eecfa1" />
      </RoundedBox>
      <mesh position={[0, 0.65, 0]}><boxGeometry args={[1.3, 0.15, 0.6]} /><meshStandardMaterial color="#8b4513" /></mesh>
      {/* Chân bàn */}
      <mesh position={[-0.6, 0.35, -0.3]}><cylinderGeometry args={[0.03, 0.03, 0.7]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[0.6, 0.35, -0.3]}><cylinderGeometry args={[0.03, 0.03, 0.7]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[-0.6, 0.35, 0.3]}><cylinderGeometry args={[0.03, 0.03, 0.7]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[0.6, 0.35, 0.3]}><cylinderGeometry args={[0.03, 0.03, 0.7]} /><meshStandardMaterial color="#333" /></mesh>
      {/* Ghế */}
      <group position={[0, 0, 0.5]}>
         <mesh position={[0, 0.4, 0]}><boxGeometry args={[0.4, 0.05, 0.4]} /><meshStandardMaterial color="#555" /></mesh>
         <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.03, 0.03, 0.4]} /><meshStandardMaterial color="#333" /></mesh>
         <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.2, 0.2, 0.05]} /><meshStandardMaterial color="#333" /></mesh>
      </group>
    </group>
  )
}
// --- COMPONENT: CỬA RA VÀO (NÂNG CẤP ĐẸP HƠN & MỞ HÉ) ---
const EndDoor = () => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  // Hiệu ứng mở hé nhẹ nhàng: chỉ -0.25 radian (khoảng 15 độ) để không lộ phía sau
  const doorRotation = hovered ? -0.25 : 0; 

  return (
    <group position={[0, 0, -32]}> 
      {/* 1. Tường bao (End Wall) */}
      <mesh position={[0, 2, -0.1]} receiveShadow>
        <planeGeometry args={[12, 5]} />
        <meshStandardMaterial color="#fef3c7" />
      </mesh>

      {/* 2. Khung cửa (Door Frame) - Tạo giật cấp 3D */}
      <group position={[0, 1.6, 0.05]}>
         {/* Khung ngoài */}
         <mesh>
            <boxGeometry args={[2.6, 3.4, 0.1]} />
            <meshStandardMaterial color="#3e2723" />
         </mesh>
         {/* Lõm bên trong (để cánh cửa lọt vào) */}
         <mesh position={[0, 0, 0.06]}>
            <boxGeometry args={[2.3, 3.1, 0.05]} />
            <meshStandardMaterial color="#ff6e07ff" />
         </mesh>
      </group>
      
      {/* 3. Cánh cửa (Door Leaf) */}
      {/* Group này dời vị trí sang phải 1.15 để làm bản lề */}
      <group position={[1.15, 1.6, 0.15]} rotation={[0, doorRotation, 0]}>
        {/* Dịch ngược lại -1.15 để cánh cửa xoay quanh cạnh phải */}
        <group position={[-1.15, 0, 0]}>
            
            {/* Thân cửa */}
            <RoundedBox args={[2.3, 3.1, 0.08]} radius={0.02} smoothness={4}>
                <meshStandardMaterial 
                  color={hovered ? "#e6c28b" : "#c18e5c"} // Màu gỗ sáng và ấm hơn khi hover
                  roughness={0.7}
                  emissive={hovered ? "#ad7e4c" : "#000000"} // Thêm hiệu ứng phát sáng nhẹ
                  emissiveIntensity={hovered ? 0.2 : 0}
                />
            </RoundedBox>

            {/* Ô kính cửa sổ (Classroom Window) */}
            <mesh position={[0, 0.5, 0.05]}>
                <boxGeometry args={[1.2, 0.8, 0.02]} />
                <meshPhysicalMaterial 
                    color="#87ceeb" 
                    roughness={0} 
                    metalness={0.1} 
                    transmission={0.6} // Trong suốt
                    thickness={0.5}
                />
            </mesh>
            {/* Viền kính */}
            <mesh position={[0, 0.5, 0.05]}>
                 <boxGeometry args={[1.25, 0.85, 0.01]} />
                 <meshStandardMaterial color="#3e2723" />
            </mesh>

            {/* Tấm kim loại chân cửa (Kick plate) */}
            <mesh position={[0, -1.2, 0.05]}>
                <planeGeometry args={[2.1, 0.4]} />
                <meshStandardMaterial color="#b0b0b0" metalness={0.6} roughness={0.3} />
            </mesh>

            {/* Tay nắm cửa (Handle) */}
            <group position={[0.9, -0.1, 0.06]}>
                {/* Trục */}
                <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0.02]}>
                    <cylinderGeometry args={[0.03, 0.03, 0.05]} />
                    <meshStandardMaterial color={hovered ? "gold" : "silver"} metalness={0.8} roughness={0.2} /> {/* Tay nắm hóa vàng khi hover */}
                </mesh>
                {/* Tay gạt */}
                <mesh position={[-0.1, 0, 0.05]}>
                    <boxGeometry args={[0.3, 0.04, 0.02]} />
                    <meshStandardMaterial color={hovered ? "gold" : "silver"} metalness={0.8} roughness={0.2} /> {/* Tay nắm hóa vàng khi hover */}
                </mesh>
            </group>

            {/* Vùng click tàng hình (Hitbox to hơn để dễ bấm) */}
            <mesh 
              visible={false} 
              scale={[1.1, 1.1, 2]} 
              onClick={() => navigate('/student')}
              onPointerOver={() => setHovered(true)}
              onPointerOut={() => setHovered(false)}
            >
                <boxGeometry />
            </mesh>
        </group>
      </group>

      {/* 4. Biển hiệu treo (Hanging Sign) */}
      <group position={[0.8, 2.8, 0.2]} rotation={[0, 0, -0.05]}>
        {/* Dây treo */}
        <mesh position={[-0.5, 0.3, 0]} rotation={[0, 0, 0.2]}>
            <cylinderGeometry args={[0.005, 0.005, 0.6]} />
            <meshBasicMaterial color="#333" />
        </mesh>
        <mesh position={[0.5, 0.3, 0]} rotation={[0, 0, -0.2]}>
            <cylinderGeometry args={[0.005, 0.005, 0.6]} />
            <meshBasicMaterial color="#333" />
        </mesh>
        
        {/* Bảng tên */}
        <RoundedBox args={[1.8, 0.6, 0.05]} radius={0.02}>
          <meshStandardMaterial color="#1f2937" />
        </RoundedBox>
        <Text position={[0, 0.05, 0.06]} fontSize={0.22} color="white" anchorX="center" anchorY="middle" fontWeight="bold">
          Emo Room 😺
        </Text>
        <Text position={[0, -0.15, 0.06]} fontSize={0.12} color="#9ca3af" anchorX="center" anchorY="middle" fontStyle="italic">
          (Gõ cửa để vào)
        </Text>
      </group>
    </group>
  );
};

// --- SCENE CHÍNH ---
const ClassroomScene = ({ scrollRef, viewOffsetRef }) => {
  const scroll = useScroll();
  const { camera, gl } = useThree();
  const isMobile = useIsMobile();
  
  gl.shadowMap.enabled = true;

  // LƯU SCROLL VÀO REF ĐỂ COMPONENT NGOÀI CANVAS ĐIỀU KHIỂN
  useEffect(() => {
    if (scrollRef) scrollRef.current = scroll;
  }, [scroll, scrollRef]);

  const wallDist = isMobile ? 3.2 : 6;
  const itemDist = isMobile ? 2.0 : 4;
  const deskDist = isMobile ? 1.4 : 2.5;
  const deskScale = isMobile ? 0.8 : 1;

  useFrame((state, delta) => {
    const targetZ = -scroll.offset * 28; 
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.08);
    
    // Logic xoay camera: Trên Mobile chỉ dùng nút bấm, trên PC dùng chuột + nút
    const lookX = isMobile 
        ? viewOffsetRef.current 
        : (-state.pointer.x * 0.8) + viewOffsetRef.current;
    
    const lookY = state.pointer.y * 0.3;  
    
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, lookX, 0.05);
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, lookY, 0.05);

    const camHeight = isMobile ? 1.5 : 1.7;
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, camHeight + Math.sin(state.clock.elapsedTime * 6) * 0.02, 0.1);
    
  });

  const responsiveWallItems = useMemo(() => {
    return BASE_WALL_ITEMS.map(item => ({
      ...item,
      position: [item.side === 'left' ? -itemDist : itemDist, 2, item.z],
      rotation: [0, item.side === 'left' ? Math.PI / 3 : -Math.PI / 3, 0]
    }));
  }, [itemDist]);

  return (
    <>
      <color attach="background" args={['#dbeafe']} /> 
      <fog attach="fog" args={['#dbeafe', 5, 35]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[0, 4, -10]} intensity={0.5} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -18]} receiveShadow><planeGeometry args={[wallDist * 2, 80]} /> <meshStandardMaterial color="#deb887" /> </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4.5, -18]}><planeGeometry args={[wallDist * 2, 80]} /><meshStandardMaterial color="#f3f4f6" /></mesh>
      <mesh position={[-wallDist, 2.25, -18]} rotation={[0, Math.PI / 2, 0]} receiveShadow><planeGeometry args={[80, 4.5]} /> <meshStandardMaterial color="#fffbeb" /></mesh>
      <mesh position={[wallDist, 2.25, -18]} rotation={[0, -Math.PI / 2, 0]} receiveShadow><planeGeometry args={[80, 4.5]} /> <meshStandardMaterial color="#fffbeb" /></mesh>

      {!isMobile && [0, -8, -16, -24, -32].map((z, i) => (
        <group key={i}>
           <mesh position={[-wallDist + 0.1, 2.5, z]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[3, 2]} /><meshBasicMaterial color="#bae6fd" /></mesh>
           <mesh position={[wallDist - 0.1, 2.5, z]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[3, 2]} /><meshBasicMaterial color="#bae6fd" /></mesh>
        </group>
      ))}

      {[-3, -8, -13, -18, -23].map((z, i) => (
        <React.Fragment key={i}>
          <Desk position={[-deskDist, 0, z]} rotationY={0.2} scale={deskScale} />
          <Desk position={[deskDist, 0, z]} rotationY={-0.2} scale={deskScale} />
        </React.Fragment>
      ))}

      {responsiveWallItems.map((item, idx) => (
        <PinBoard key={idx} item={item} isMobile={isMobile} />
      ))}

      <EndDoor />
    </>
  );
};

// --- MAIN COMPONENT ---
const LandingPage3D = () => {
  const isMobile = useIsMobile();
  
  // Refs để điều khiển từ bên ngoài Canvas
  const scrollRef = useRef(null);
  const viewOffsetRef = useRef(0);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#dbeafe' }}>
      <Canvas camera={{ position: [0, 1.7, 5], fov: 60 }} shadows>
        <ScrollControls pages={6} damping={0.3}>
          <ClassroomScene scrollRef={scrollRef} viewOffsetRef={viewOffsetRef} />
        </ScrollControls>
      </Canvas>
      
      {/* Giao diện Overlay (Nằm ngoài Canvas để đảm bảo không lỗi hiển thị) */}
      {isMobile ? (
        <MobileControlsOverlay scrollRef={scrollRef} viewOffsetRef={viewOffsetRef} />
      ) : (
        <div style={{
          position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
          textAlign: 'center', pointerEvents: 'none',
          background: 'rgba(255,255,255,0.8)', padding: '12px 24px', borderRadius: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#4b5563', fontWeight: 'bold' }}>DI CHUỘT ĐỂ NHÌN XUNG QUANH</p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>(Cuộn chuột để di chuyển • Click vào bảng để xem gần)</p>
        </div>
      )}
    </div>
  );
};
export default LandingPage3D;