from ultralytics import YOLO


model = YOLO("yolov8n.pt")


model.train(
    data="C:/Users/askar/Downloads/inDrive/inDrive/final_dataset/data.yaml",
    epochs=50,
    imgsz=640,
    batch=16  
)

 