#!/usr/bin/env python3
"""
生成Markdown编辑器应用图标
"""

import os
from PIL import Image, ImageDraw, ImageFont

def create_icon(size):
    """创建指定尺寸的图标"""
    # 创建画布
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 计算缩放比例
    scale = size / 512
    
    # 背景颜色渐变效果（简化为单色）
    bg_color = (74, 144, 226, 255)  # 蓝色背景
    
    # 绘制圆角矩形背景
    corner_radius = int(size * 0.15)
    margin = int(size * 0.05)
    
    # 绘制背景
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=corner_radius,
        fill=bg_color
    )
    
    # 绘制文档图标
    doc_color = (255, 255, 255, 255)  # 白色
    
    # 文档主体
    doc_width = int(size * 0.45)
    doc_height = int(size * 0.6)
    doc_x = int(size * 0.275)
    doc_y = int(size * 0.2)
    
    # 绘制文档
    draw.rectangle(
        [doc_x, doc_y, doc_x + doc_width, doc_y + doc_height],
        fill=doc_color
    )
    
    # 绘制文档折角
    fold_size = int(size * 0.08)
    fold_color = (224, 224, 224, 255)  # 灰色
    
    # 折角三角形
    fold_points = [
        (doc_x + doc_width - fold_size, doc_y),
        (doc_x + doc_width, doc_y + fold_size),
        (doc_x + doc_width - fold_size, doc_y + fold_size)
    ]
    draw.polygon(fold_points, fill=fold_color)
    
    # 绘制M字母
    try:
        # 尝试使用系统字体
        font_size = int(size * 0.12)
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
        except:
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", font_size)
            except:
                font = ImageFont.load_default()
        
        # M字母位置
        text_y = doc_y + int(doc_height * 0.35)
        
        # 获取文本边界框来居中
        bbox = draw.textbbox((0, 0), "M", font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        text_x = size // 2 - text_width // 2
        
        draw.text((text_x, text_y - text_height // 2), "M", fill=bg_color, font=font)
        
    except Exception as e:
        print(f"字体加载失败，使用默认字体: {e}")
        draw.text((size//2 - 10, doc_y + int(doc_height * 0.35)), "M", fill=bg_color)
    
    # 绘制下箭头
    arrow_size = int(size * 0.06)
    arrow_y = text_y + int(size * 0.08)
    arrow_points = [
        (size // 2 - arrow_size // 2, arrow_y),
        (size // 2 + arrow_size // 2, arrow_y),
        (size // 2, arrow_y + arrow_size)
    ]
    draw.polygon(arrow_points, fill=bg_color)
    
    # 绘制文本线条
    line_color = (192, 192, 192, 255)  # 灰色
    line_height = max(1, int(size * 0.015))
    line_spacing = int(size * 0.035)
    line_start_x = doc_x + int(size * 0.05)
    line_width_1 = int(doc_width * 0.7)
    line_width_2 = int(doc_width * 0.5)
    lines_start_y = doc_y + int(doc_height * 0.6)
    
    for i in range(3):
        y = lines_start_y + i * line_spacing
        width = line_width_2 if i == 2 else line_width_1
        draw.rectangle(
            [line_start_x, y, line_start_x + width, y + line_height],
            fill=line_color
        )
    
    return img

def main():
    """主函数"""
    # 创建所需的图标尺寸
    sizes = [16, 32, 64, 128, 256, 512, 1024]
    
    print("正在生成图标...")
    
    # 创建临时目录存放PNG文件
    temp_dir = "icon_temp"
    os.makedirs(temp_dir, exist_ok=True)
    
    # 生成所有尺寸的PNG图标
    for size in sizes:
        print(f"生成 {size}x{size} 图标...")
        icon = create_icon(size)
        icon.save(f"{temp_dir}/icon_{size}x{size}.png", "PNG")
    
    print("图标生成完成！")
    print(f"PNG文件保存在 {temp_dir}/ 目录中")
    
    # 创建一个1024x1024的主图标
    main_icon = create_icon(1024)
    main_icon.save("icon.png", "PNG")
    print("主图标保存为 icon.png")

if __name__ == "__main__":
    main()