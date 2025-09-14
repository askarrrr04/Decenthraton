import os
import shutil

# Пути к датасетам
dataset1_path = r"C:\Users\askar\Downloads\inDrive\inDrive\final_dataset"
dataset2_path = r"C:\Users\askar\Downloads\inDrive\inDrive\dirt finding.v3i.yolov8"

# Новый объединённый датасет
final_path = r"C:\Users\askar\Downloads\inDrive\inDrive\final_dataset_1"

# Создаём структуру папок
for split in ["train", "valid", "test"]:
    os.makedirs(os.path.join(final_path, "images", split), exist_ok=True)
    os.makedirs(os.path.join(final_path, "labels", split), exist_ok=True)

# Словарь для замены классов второго датасета
# 0 = clean, 1 = dirt-clean-areas → 3 = dirt
class_map = {0: None, 1: 3}  # None = пропускаем класс clean

# Функция безопасного копирования
def safe_copy(src, dst_folder):
    if not os.path.exists(src):
        print(f"⚠️ Файл не найден: {src}")
        return
    filename = os.path.basename(src)
    # сокращаем слишком длинные имена
    if len(filename) > 100:
        name, ext = os.path.splitext(filename)
        filename = name[:50] + "_" + ext
    dst_file = os.path.join(dst_folder, filename)
    shutil.copy(src, dst_file)
    return filename  # возвращаем имя файла

# Основная функция копирования датасета
def copy_dataset(src_path, img_dest, lbl_dest, class_map=None):
    for split in ["train", "valid", "test"]:
        img_src = os.path.join(src_path, split, "images")
        lbl_src = os.path.join(src_path, split, "labels")
        img_dst = os.path.join(img_dest, split)
        lbl_dst = os.path.join(lbl_dest, split)

        if not os.path.exists(img_src):
            continue

        for img_file in os.listdir(img_src):
            if not img_file.lower().endswith((".jpg", ".png", ".jpeg")):
                continue
            # Копируем изображение безопасно
            new_filename = safe_copy(os.path.join(img_src, img_file), img_dst)
            if new_filename is None:
                continue

            # Копируем метку
            lbl_file = os.path.splitext(img_file)[0] + ".txt"
            lbl_src_file = os.path.join(lbl_src, lbl_file)
            lbl_dst_file = os.path.join(lbl_dst, os.path.splitext(new_filename)[0] + ".txt")

            if os.path.exists(lbl_src_file):
                if class_map:
                    new_lines = []
                    with open(lbl_src_file, "r") as f:
                        for line in f.readlines():
                            parts = line.strip().split()
                            cls_id = int(parts[0])
                            if cls_id in class_map:
                                new_cls = class_map[cls_id]
                                if new_cls is not None:
                                    parts[0] = str(new_cls)
                                    new_lines.append(" ".join(parts))
                    if new_lines:
                        with open(lbl_dst_file, "w") as f:
                            f.write("\n".join(new_lines))
                else:
                    shutil.copy(lbl_src_file, lbl_dst_file)

# Копируем первый датасет (без изменений)
copy_dataset(dataset1_path,
             img_dest=os.path.join(final_path, "images"),
             lbl_dest=os.path.join(final_path, "labels"))

# Копируем второй датасет с заменой классов
copy_dataset(dataset2_path,
             img_dest=os.path.join(final_path, "images"),
             lbl_dest=os.path.join(final_path, "labels"),
             class_map=class_map)

# Создаём data.yaml для объединённого датасета
data_yaml = f"""
path: {final_path}
train: images/train
val: images/valid
test: images/test

nc: 5
names: ['dent', 'scratch', 'rust', 'dirt', 'clean']
"""

with open(os.path.join(final_path, "data.yaml"), "w") as f:
    f.write(data_yaml.strip())

print("✅ Датасеты объединены в final_dataset_1!")
