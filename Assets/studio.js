/* WorkBadge · local product viewer. All model data and textures remain on this computer. */
(async()=>{
const T=window.THREE, {OrbitControls}=window.THREEControls;
const query=new URLSearchParams(location.search), renderMode=query.has('render');
if(renderMode)document.body.classList.add('render');
const stage=document.getElementById('stage'), modelMeta=JSON.parse(document.getElementById('part-data').textContent);
const textures=JSON.parse(document.getElementById('texture-data').textContent);
const renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','WorkBadge in 3D; mit Maus oder Touch drehen');renderer.domElement.tabIndex=0;
const scene=new T.Scene();
const camera=new T.OrthographicCamera(-55,55,40,-40,.1,1000);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.12;controls.enablePan=false;
controls.minZoom=.6;controls.maxZoom=2.6;controls.autoRotateSpeed=1.15;
const env=new window.THREEEnvironment.RoomEnvironment();
const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(env,.035).texture;
scene.environmentIntensity=.55;env.dispose();pmrem.dispose();
scene.add(new T.HemisphereLight(0xffffff,0x687761,.5));
const key=new T.DirectionalLight(0xfff9ed,2.4);key.position.set(-45,90,85);key.castShadow=true;
key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-110;key.shadow.camera.right=110;
key.shadow.camera.top=110;key.shadow.camera.bottom=-110;key.shadow.camera.near=.1;key.shadow.camera.far=350;
key.shadow.bias=-.00015;key.shadow.normalBias=.055;key.shadow.radius=4;scene.add(key);
const fill=new T.DirectionalLight(0xe9f2e7,.75);fill.position.set(85,25,-65);scene.add(fill);
const rim=new T.DirectionalLight(0xffffff,1.0);rim.position.set(-80,12,-85);scene.add(rim);
const floor=new T.Mesh(new T.PlaneGeometry(700,700),new T.ShadowMaterial({color:0x2b3828,opacity:.16}));
floor.rotation.x=-Math.PI/2;floor.position.y=-25;floor.receiveShadow=true;scene.add(floor);
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=256;shadowCanvas.height=256;
const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(128,128,3,128,128,126);
gradient.addColorStop(0,'rgba(32,47,30,.15)');gradient.addColorStop(.5,'rgba(32,47,30,.08)');gradient.addColorStop(1,'rgba(32,47,30,0)');
ctx.fillStyle=gradient;ctx.fillRect(0,0,256,256);
const contact=new T.Mesh(new T.PlaneGeometry(105,42),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
contact.rotation.x=-Math.PI/2;contact.position.set(4,-24.98,-2);scene.add(contact);
const bytes=Uint8Array.from(atob(document.getElementById('model-data').textContent.trim()),c=>c.charCodeAt(0));
const gltf=await new window.THREELoader.GLTFLoader().parseAsync(bytes.buffer,'');
const product=new T.Group();scene.add(product);product.add(gltf.scene);gltf.scene.scale.setScalar(1000);
const meshList=[];
gltf.scene.traverse(obj=>{if(!obj.isMesh)return;
 const meta=modelMeta.parts.find(p=>p.name.replace(/[^a-zA-Z0-9_]/g,'_')===obj.name)||modelMeta.parts.find(p=>p.name===obj.name);
 obj.userData.category=obj.userData.category||meta?.category||'rear';obj.userData.original=obj.userData.original_stl||meta?.source||null;
 obj.userData.base=obj.position.clone();
 if(!obj.material.map)obj.geometry=window.THREEUtils.toCreasedNormals(obj.geometry,Math.PI*.22);
 obj.castShadow=true;obj.receiveShadow=true;
 obj.material.envMapIntensity=.55;
 if(obj.userData.category==='screen')obj.material=new T.MeshBasicMaterial({map:obj.material.map,toneMapped:false});
 meshList.push(obj);
});
const loader=new T.TextureLoader(),maps={};
await Promise.all(Object.entries(textures).map(async([name,url])=>{
 const tx=await loader.loadAsync(url);tx.colorSpace=T.SRGBColorSpace;tx.flipY=false;tx.anisotropy=renderer.capabilities.getMaxAnisotropy();maps[name]=tx;
}));
let view='angle',display='status',color='ivory';
const cameras={angle:{pos:[65,48,120],target:[0,-1,-5],height:76},front:{pos:[0,0,145],target:[0,0,-5],height:69},
 back:{pos:[-54,34,-125],target:[0,-1,-5],height:76},exploded:{pos:[112,65,106],target:[0,0,-8],height:108},
 rearflat:{pos:[0,0,-145],target:[0,0,-5],height:70}};
function size(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);
 const height=cameras[view]?.height||76,aspect=w/h;
 const responsiveHeight=aspect<.95?Math.max(height,96/aspect):height;
 camera.top=responsiveHeight/2;camera.bottom=-responsiveHeight/2;camera.left=-responsiveHeight*aspect/2;camera.right=responsiveHeight*aspect/2;camera.updateProjectionMatrix();}
function setView(next){if(!cameras[next])return;view=next;
 for(const mesh of meshList){mesh.position.copy(mesh.userData.base);
  if(view==='exploded'){const offset=modelMeta.exploded_offsets_mm[mesh.userData.category]||[0,0,0];mesh.position.add(new T.Vector3(...offset).multiplyScalar(.001));}}
 const state=cameras[view];camera.position.set(...state.pos);camera.zoom=1;
 controls.target.set(...state.target);camera.lookAt(controls.target);controls.update();
 floor.visible=false;contact.visible=view!=='exploded'&&!renderMode;
 document.querySelectorAll('button[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
 document.body.dataset.view=view;size();updateDownload();}
function setDisplay(next){if(!maps[next])return;display=next;
 for(const mesh of meshList)if(mesh.userData.category==='screen'){mesh.material.map=maps[next];mesh.material.needsUpdate=true;}
 document.querySelectorAll('button[data-display]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.display===display)));
 document.body.dataset.display=display;}
function setColor(next){if(!['ivory','forest'].includes(next))return;color=next;
 for(const mesh of meshList)if(mesh.userData.original){mesh.material.color.set(color==='forest'?0x38634c:0xd3d7cc);mesh.material.roughness=.63;}
 document.querySelectorAll('button[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===color)));
 document.getElementById('color-label').textContent=color==='forest'?'Waldgrün · Farbkonzept':'Perlweiß';
 document.body.dataset.color=color;updateDownload();}
function updateDownload(){document.getElementById('download').href='Modelle/'+(view==='exploded'?'WorkBadge-Explosionsansicht.glb':color==='forest'?'WorkBadge-Waldgruen-Farbkonzept.glb':'WorkBadge-Perlweiss.glb');}
document.querySelectorAll('button[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelectorAll('button[data-display]').forEach(b=>b.addEventListener('click',()=>setDisplay(b.dataset.display)));
document.querySelectorAll('button[data-color]').forEach(b=>b.addEventListener('click',()=>setColor(b.dataset.color)));
document.querySelector('.rotate').addEventListener('click',e=>{controls.autoRotate=!controls.autoRotate;e.currentTarget.setAttribute('aria-pressed',String(controls.autoRotate));e.currentTarget.setAttribute('aria-label',controls.autoRotate?'Automatische Drehung ausschalten':'Automatische Drehung einschalten');});
renderer.domElement.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();
 const offset=camera.position.clone().sub(controls.target),s=new T.Spherical().setFromVector3(offset);
 if(e.key==='ArrowLeft')s.theta-=.13;if(e.key==='ArrowRight')s.theta+=.13;if(e.key==='ArrowUp')s.phi-=.1;if(e.key==='ArrowDown')s.phi+=.1;
 s.phi=Math.max(.05,Math.min(Math.PI-.05,s.phi));camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(s));controls.update();});
window.addEventListener('resize',size);new ResizeObserver(size).observe(stage);
setView(query.get('view')||'angle');setDisplay(query.get('display')||'status');setColor(query.get('color')||'ivory');
if(query.has('white')){scene.background=new T.Color(0xffffff);}
document.querySelector('.loading').remove();
window.WorkBadgeStudio={setView,setDisplay,setColor,scene,product,camera,controls,renderer,meshList,
 snapshot:()=>({view,display,color,meshes:meshList.length,sourceParts:meshList.filter(m=>m.userData.original).length,
  bounds:new T.Box3().setFromObject(product).getSize(new T.Vector3()).toArray(),triangles:meshList.reduce((s,m)=>s+(m.geometry.index?.count||m.geometry.attributes.position.count)/3,0)})};
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}animate();
document.body.dataset.ready='true';
})().catch(error=>{document.body.dataset.error=error.message;const loading=document.querySelector('.loading');if(loading)loading.textContent='3D-Ansicht konnte nicht geladen werden: '+error.message;console.error(error);});
