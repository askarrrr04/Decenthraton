from ultralytics import YOLO
import cv2
import os
import sys

# Пути к моделям
state_model_path = r"C:\Users\askar\Desktop\indrive code\runs\detect\train\weights\best.pt"   # удары/царапины
parts_model_path = r"C:\Users\askar\Desktop\indrive code\runs\segment\train4\weights\best.pt"   # детали машины
dirt_model_path  = r"C:\Users\askar\Desktop\indrive code\runs\train\car_dirt_m2\weights\best.pt"  # грязь

# Загружаем модели
state_model = YOLO(state_model_path)
parts_model = YOLO(parts_model_path)
dirt_model  = YOLO(dirt_model_path)

save_dir = r"C:\Users\askar\Desktop\indrive code\runs\predict_combined"
os.makedirs(save_dir, exist_ok=True)

def process_image(image_path):
    img = cv2.imread(image_path)
    
    # Детали машины
    parts_results = parts_model.predict(img, imgsz=512)
    parts = []
    for r in parts_results:
        for box in r.boxes:
            parts.append({
                "name": r.names[int(box.cls)],
                "xyxy": box.xyxy[0].tolist()  # [x1, y1, x2, y2]
            })
    
    # Состояние машины
    state_results = state_model.predict(img, imgsz=512)
    damaged_parts = []
    for r in state_results:
        for box in r.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            # Сопоставление с деталями
            for part in parts:
                px1, py1, px2, py2 = part["xyxy"]
                # Если пересекаются прямоугольники
                if not (x2 < px1 or x1 > px2 or y2 < py1 or y1 > py2):
                    damaged_parts.append((part["name"], r.names[int(box.cls)]))
    
    # Грязь/чисто
    dirt_results = dirt_model.predict(img, imgsz=512)
    dirt_state = "Не обнаружено"
    for r in dirt_results:
        if len(r.boxes) > 0:
            dirt_state = "Грязно"
        else:
            dirt_state = "Чисто"
    
    # Выводим только нужное
    print("🔧 Повреждённые детали:")
    if damaged_parts:
        for name, damage in damaged_parts:
            print(f"  {name} ({damage})")
    else:
        print("  Не обнаружено")

    print("🧹 Состояние грязи/чисто:")
    print(f"  {dirt_state}")
    
    # Рисуем повреждения на картинке
    for part_name, damage in damaged_parts:
        for part in parts:
            if part["name"] == part_name:
                x1, y1, x2, y2 = map(int, part["xyxy"])
                cv2.rectangle(img, (x1, y1), (x2, y2), (0,0,255), 2)
                cv2.putText(img, f"{part_name} ({damage})", (x1, y1-5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,0,255), 2)
    cv2.putText(img, f"Грязь: {dirt_state}", (10,30),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (255,0,0), 2)
    
    # Сохраняем результат
    save_path = os.path.join(save_dir, os.path.basename(image_path))
    cv2.imwrite(save_path, img)
    print(f"✅ Результат сохранён: {save_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: No image path provided")
        sys.exit(1)
    
    image_path = sys.argv[1]
    process_image(image_path)