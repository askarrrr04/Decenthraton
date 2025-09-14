"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Car, CheckCircle, AlertCircle, Clock, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssessmentResult {
  bumpers: string[];
  doors: string[];
  body: string[];
  status: string;
  description: string;
  modelUrl: string;
}

function ThreeDViewer({ modelUrl }: { modelUrl: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const animationIdRef = useRef<number>();

  useEffect(() => {
    if (!mountRef.current) return;

    const loadThreeJS = async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

      initThreeJS(THREE, GLTFLoader, OrbitControls);
    };

    const initThreeJS = (THREE: any, GLTFLoader: any, OrbitControls: any) => {
      const width = mountRef.current!.clientWidth;
      const height = 400;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xffffff); // Pure white background
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.set(5, 5, 5);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      rendererRef.current = renderer;

      mountRef.current!.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;

      const ambientLight = new THREE.AmbientLight(0x404040, 1.8); // Increased intensity
      scene.add(ambientLight);

      const directionalLight1 = new THREE.DirectionalLight(0xffffff, 2.0); // Increased intensity
      directionalLight1.position.set(10, 10, 5);
      scene.add(directionalLight1);

      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 2.0); // Additional light
      directionalLight2.position.set(-10, 10, -5);
      scene.add(directionalLight2);

      const loader = new GLTFLoader();
      loader.load(
        modelUrl,
        (gltf: any) => {
          console.log("[v0] Model loaded successfully");
          const model = gltf.scene;
          model.scale.set(1, 1, 1);
          model.position.set(0, 0, 0);

          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = false; // Disable shadows
              child.receiveShadow = false;
            }
          });

          scene.add(model);

          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(center);
        },
        (progress: any) => {
          console.log("[v0] Loading progress:", (progress.loaded / progress.total) * 100 + "%");
        },
        (error: any) => {
          console.error("[v0] Error loading model:", error);
          loader.load(
            "/0.glb",
            (gltf: any) => {
              const model = gltf.scene;
              model.scale.set(1, 1, 1);
              model.position.set(0, 0, 0);
              model.traverse((child: any) => {
                if (child.isMesh) {
                  child.castShadow = false;
                  child.receiveShadow = false;
                }
              });
              scene.add(model);
              const box = new THREE.Box3().setFromObject(model);
              const center = box.getCenter(new THREE.Vector3());
              model.position.sub(center);
            },
            undefined,
            (fallbackError: any) => {
              console.error("[v0] Error loading fallback model:", fallbackError);
              const geometry = new THREE.BoxGeometry(2, 1, 4);
              const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
              const cube = new THREE.Mesh(geometry, material);
              scene.add(cube);
            }
          );
        }
      );

      const animate = () => {
        animationIdRef.current = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        if (!mountRef.current) return;
        const newWidth = mountRef.current.clientWidth;
        camera.aspect = newWidth / height;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, height);
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    };

    loadThreeJS().catch((error) => {
      console.error("[v0] Failed to load Three.js libraries:", error);
    });

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [modelUrl]);

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-foreground">3D модель автомобиля:</h4>
      <div
        ref={mountRef}
        className="w-full h-96 rounded-lg border border-border bg-muted overflow-hidden"
        style={{ minHeight: "400px" }}
      />
      <p className="text-xs text-muted-foreground">Используйте мышь для вращения, колесо для масштабирования</p>
    </div>
  );
}

export function CarAssessmentApp() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusMap: Record<string, string> = {
    Чисто: "Хорошее состояние",
    Грязно: "Требуется мойка",
    Повреждено: "Требуется ремонт",
  };

  const partDisplayMap: Record<string, string> = {
    front_bumper: "Передний бампер",
    back_bumper: "Задний бампер",
    front_left_door: "Левая передняя дверь",
    front_right_door: "Правая передняя дверь",
    back_left_door: "Левая задняя дверь",
    back_right_door: "Правая задняя дверь",
    hood: "Капот",
    front_glass: "Переднее стекло",
    back_glass: "Заднее стекло",
  };

  const issueDisplayMap: Record<string, string> = {
    dent: "вмятина",
    scratch: "царапина",
    crack: "трещина",
  };

  const partToId: Record<string, number> = {
    front_left_door: 1, // левая передняя дверь
    back_left_door: 2,  // левая задняя дверь
    front_right_door: 3, // правая передняя дверь
    back_right_door: 4,  // правая задняя дверь
    hood: 5,             // кузов (капOT)
    front_glass: 5,      // кузов (переднее стекло)
    back_glass: 5,       // кузов (заднее стекло)
    front_bumper: 6,     // бампер
    back_bumper: 6,      // бампер
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setError(null);
      setResult(null);
    } else {
      setError("Пожалуйста, выберите изображение");
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setError(null);
      setResult(null);
    } else {
      setError("Пожалуйста, выберите изображение");
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      console.log("Sending POST request to http://localhost:8080/upload");
      const response = await fetch("http://localhost:8080/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Ошибка при анализе изображения: ${response.statusText} (${response.status})`);
      }

      const predictResult = await response.json();
      console.log("Received response:", predictResult);

      if (!predictResult.bumpers || !predictResult.doors || !predictResult.body || !predictResult.status) {
        throw new Error("Некорректный формат ответа от сервера");
      }

      // Extract parts for model selection
      const parts: string[] = [
        ...predictResult.bumpers,
        ...predictResult.doors,
        ...predictResult.body,
      ].map((part: string) => part.split(" ")[0]);

      // Generate model URL
      const partIds = parts
        .map((part) => partToId[part])
        .filter((id) => id !== undefined)
        .sort((a, b) => a - b)
        .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates

      const modelName = partIds.length > 0 ? partIds.join("") : "0";
      const modelUrl = `/${modelName}.glb`;

      // Format issues for display
      const issues = [
        ...predictResult.bumpers,
        ...predictResult.doors,  
        ...predictResult.body,
      ].map((issue) => {
        const [part, damage] = issue.split(" (");
        const cleanDamage = damage ? damage.replace(")", "") : "";
        const partName = partDisplayMap[part] || part;
        const issueName = issueDisplayMap[cleanDamage] || cleanDamage;
        return `${partName}${issueName ? `: ${issueName}` : ""}`;
      });

      const description = issues.length
        ? `Автомобиль имеет ${issues.length > 1 ? "несколько повреждений" : "повреждение"}, требующее${issues.length > 1 ? "го" : ""} ремонта.`
        : "Автомобиль в отличном состоянии, повреждения не обнаружены.";

      const status = issues.length ? "Повреждено" : predictResult.status;

      const assessmentResult: AssessmentResult = {
        bumpers: predictResult.bumpers,
        doors: predictResult.doors,
        body: predictResult.body,
        status,
        description,
        modelUrl,
      };

      setResult(assessmentResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Произошла неизвестная ошибка";
      setError(errorMessage);
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Чисто":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "Грязно":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "Повреждено":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
              <Car className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">CarCheck AI</h1>
              <p className="text-sm text-muted-foreground">Определение состояния автомобиля по фото</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Загрузить фото автомобиля
              </CardTitle>
              <CardDescription>Выберите четкое фото автомобиля для анализа состояния</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "border-2 border-dashed border-border rounded-lg p-8 text-center transition-colors",
                  "hover:border-primary/50 hover:bg-muted/50",
                  selectedFile && "border-primary bg-primary/5"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-primary/10">
                      <ImageIcon className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      onClick={handleUpload}
                      disabled={isUploading || isProcessing}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {isUploading ? "Загрузка..." : isProcessing ? "Анализ..." : "Анализировать фото"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-muted">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-foreground">
                        Перетащите фото сюда или нажмите для выбора
                      </p>
                      <p className="text-sm text-muted-foreground">Поддерживаются форматы: JPG, PNG, WebP</p>
                    </div>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="bg-white border-primary text-foreground hover:bg-primary hover:text-primary-foreground"
                    >
                      Выбрать файл
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(result.status)}
                  Результат анализа
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Состояние:</span>
                    <span className="font-semibold text-foreground">{statusMap[result.status] || result.status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Дефекты:</span>
                    <div className="font-semibold text-foreground text-right">
                      {[...result.bumpers, ...result.doors, ...result.body].length ? (
                        <ul className="list-disc list-inside">
                          {[...result.bumpers, ...result.doors, ...result.body].map((issue, index) => {
                            const [part, damage] = issue.split(" (");
                            const cleanDamage = damage ? damage.replace(")", "") : "";
                            const partName = partDisplayMap[part] || part;
                            const issueName = issueDisplayMap[cleanDamage] || cleanDamage;
                            return <li key={index}>{`${partName}${issueName ? `: ${issueName}` : ""}`}</li>;
                          })}
                        </ul>
                      ) : (
                        "Отсутствуют"
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-foreground">{result.description}</p>
                </div>

                <ThreeDViewer modelUrl={result.modelUrl} />

                <Button
                  onClick={() => {
                    setSelectedFile(null);
                    setResult(null);
                    setError(null);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Анализировать другое фото
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}