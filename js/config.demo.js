window.APP_CONFIG = {
    DEFAULT: {
        TEXT_BOX_TOPLEFT: [119, 450], // 相对于画布左上角的文本框左上角坐标
        IMAGE_BOX_BOTTOMRIGHT: [119 + 279, 450 + 175], // 相对于画布左上角的图片框右下角坐标
        TEXT_COLOR: '#000000', // 默认文本颜色
        BRACKET_COLOR: '#6a5acd', // 洗脑文本颜色
        TEXT_STROKE_ENABLED: false, // 是否启用字体描边
        TEXT_STROKE_COLOR: '#ffffff', // 字体描边颜色
        USE_BASE_OVERLAY: true, // 是否使用覆盖图层
        BASE_OVERLAY_FILE: 'images/base_overlay.png' // 覆盖图层文件路径
    },
    // 字体文件配置
    FONT_FILE: {
        'Source Han Sans CN': {
            family: '"Source Han Sans CN", sans-serif', // 确保result.css中也有对应的font-family定义
            file: 'css/SourceHanSansCN-Regular/', // 使用分包后的思源黑体
            displayText: '印刷体（思源）'
        },
        'Allseto': {
            family: '"Allseto", sans-serif', // 确保result.css中也有对应的font-family定义
            file: 'css/Allseto/', // 使用分包后的全濑体
            displayText: '手写体（全濑）'
        }
    },
    // 表情差分配置：每项可以是字符串（图片路径）或对象（可覆盖 DEFAULT 中的部分字段）
    BASEIMAGE_MAPPING: {
        '普通': 'images/base/base.png',
        '开心': 'images/base/开心.png',
        '生气': 'images/base/生气.png',
        '无语': 'images/base/无语.png',
        '脸红': 'images/base/脸红.png',
        '病娇': 'images/base/病娇.png',
        '魔女化': {
            PATH: 'images/base/魔女化.png',
            TEXT_BOX_TOPLEFT: [119, 490], // 魔女化表情单独配置
            IMAGE_BOX_BOTTOMRIGHT: [540, 610],
            TEXT_COLOR: '#eeeeee',
            BRACKET_COLOR: '#8b70ff',
            TEXT_STROKE_ENABLED: true,
            TEXT_STROKE_COLOR: '#111111',
            USE_BASE_OVERLAY: false,
            BASE_OVERLAY_FILE: 'images/base_overlay.png'
        }
    }
}