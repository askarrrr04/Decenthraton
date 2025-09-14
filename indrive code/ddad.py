from ultralytics import YOLO

# Загружаем модель
model = YOLO("C:/Users/askar/Desktop/indrive code/runs/detect/train/weights/best.pt")

# Прогоняем на картинке
results = model.predict(
    source="C:/Users/askar/Downloads/1.png",
    save=True,   # сохранить картинку с предсказаниями
    conf=0.25    # минимальная уверенность
)

print("✅ Результат сохранён в:", results[0].save_dir)
