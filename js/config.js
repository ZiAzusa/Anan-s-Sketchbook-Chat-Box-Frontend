window.APP_CONFIG = {
  DEFAULT: {
    TEXT_BOX_TOPLEFT: [119, 450],
    IMAGE_BOX_BOTTOMRIGHT: [119 + 279, 450 + 175],
    TEXT_COLOR: '#000000',
    BRACKET_COLOR: '#6a5acd',
    TEXT_STROKE_ENABLED: false,
    TEXT_STROKE_COLOR: '#ffffff',
    USE_BASE_OVERLAY: true,
    BASE_OVERLAY_FILE: 'images/base_overlay.png'
  },
  FONT_FILE: {
    'Source Han Sans CN': {
      family: '"Source Han Sans CN", sans-serif',
      file: 'css/SourceHanSansCN-Regular/',
      displayText: '印刷体（思源）'
    },
    'Allseto': {
      family: '"Allseto", sans-serif',
      file: 'css/Allseto/',
      displayText: '手写体（全濑）'
    }
  },
  BASEIMAGE_MAPPING: {
    '普通': 'images/base/base.png',
    '开心': 'images/base/开心.png',
    '生气': 'images/base/生气.png',
    '无语': 'images/base/无语.png',
    '脸红': 'images/base/脸红.png',
    '病娇': 'images/base/病娇.png',
    '闭眼': 'images/base/闭眼.png',
    '难受': 'images/base/难受.png',
    '害怕': 'images/base/害怕.png',
    '激动': 'images/base/激动.png',
    '惊讶': 'images/base/惊讶.png',
    '哭泣': 'images/base/哭泣.png',
    '魔女化': {
      PATH: 'images/base/魔女化.png',
      TEXT_BOX_TOPLEFT: [119, 490],
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