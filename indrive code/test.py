from ultralytics import YOLO
from pathlib import Path
import os
import cv2

# Пути к моделям
state_model_path = r"C:\Users\askar\Desktop\indrive code\runs\detect\train\weights\best.pt"   # удары/царапины
parts_model_path = r"C:\Users\askar\Desktop\indrive code\runs\segment\train4\weights\best.pt"   # детали машины
dirt_model_path  = r"C:\Users\askar\Desktop\indrive code\runs\train\car_dirt_m2\weights\best.pt"  # грязь

# Загружаем модели
state_model = YOLO(state_model_path)
parts_model = YOLO(parts_model_path)
dirt_model = YOLO(dirt_model_path)

# Путь к изображению
img_path = r"C:\Users\askar\Downloads\2.jpg"

# Папка для сохранения
save_base = Path(r"C:\Users\askar\Desktop\indrive code\runs\predict_combined")
os.makedirs(save_base, exist_ok=True)

def run_model(model, img_path, save_subfolder):
    results = model(img_path)
    save_dir = save_base / save_subfolder
    os.makedirs(save_dir, exist_ok=True)

    output_info = []

    for r in results:
        # Сохраняем изображение с предсказаниями
        annotated_img = r.plot()  # возвращает numpy изображение
        save_path = save_dir / Path(r.path).name
        cv2.imwrite(str(save_path), cv2.cvtColor(annotated_img, cv2.COLOR_RGB2BGR))

        # Текстовые результаты
        if r.boxes is not None and len(r.boxes) > 0:
            for box in r.boxes:
                cls_name = model.model.names[int(box.cls)]
                conf = float(box.conf)
                output_info.append(f"{cls_name} ({conf:.2f})")
        elif r.masks is not None:
            output_info.append("Маски найдены")
        else:
            output_info.append("Не обнаружено")

    return output_info

# --- Запуск ---
print("Состояние машины (удары/царапины):")
state_results = run_model(state_model, img_path, "state")
for item in state_results:
    print("  ", item)

print("\nДетали машины:")
parts_results = run_model(parts_model, img_path, "parts")
for item in parts_results:
    print("  ", item)

print("\nГрязь/чистота:")
dirt_results = run_model(dirt_model, img_path, "dirt")
for item in dirt_results:
    print("  ", item)

print(f"\nСохранённые изображения в: {save_base}")
