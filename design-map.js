// Each neighborhood groups clues by their role in a future-design inquiry.
const DESIGN_ZONES={
  space:{name:'太空变化',question:'未来情境里，什么正在改变？',mark:'✧',side:-1,vertical:-1,groups:[
    ['栖居与空间',['IE-31','IE-18','IE-12','IE-15','IE-20','IE-19','IE-08','IE-29']],
    ['生命与资源',['IE-01','IE-02','IE-06','IE-04','IE-07','IE-09','IE-11','IE-14','IE-16','IE-17','IE-23','IE-26','IE-27']],
    ['身体与连接',['IE-25','IE-24','IE-22','IE-03','IE-05','IE-10','IE-13','IE-21','IE-28','IE-30']]
  ]},
  earth:{name:'地球借法',question:'今天已有哪种做法可以迁移？',mark:'◆',side:1,vertical:-1,groups:[
    ['记忆与日常',['HT-31','HT-32','HT-33','HT-02','HT-04','HT-14','HT-25']],
    ['身体与触感',['HT-01','HT-13','HT-29','HT-03','HT-09','HT-15','HT-16','HT-22','HT-24','HT-26']],
    ['工具与系统',['HT-10','HT-20','HT-12','HT-05','HT-06','HT-07','HT-08','HT-11','HT-17','HT-18','HT-19','HT-21','HT-23','HT-27','HT-28','HT-30']]
  ]},
  scene:{name:'旅客时刻',question:'谁在什么时候，遇到了什么？',mark:'≋',side:-1,vertical:1,groups:[
    ['抵达',['SC-01','SC-06','SC-11']],
    ['停留',['SC-05','SC-02','SC-07','SC-09']],
    ['牵挂与告别',['SC-03','SC-10','SC-04','SC-08','SC-12']]
  ]},
  challenge:{name:'设计限制',question:'这个方案必须在哪个条件下成立？',mark:'△',side:1,vertical:1,groups:[
    ['身体',['CH-01','CH-09','CH-06']],
    ['舱内环境',['CH-08','CH-05','CH-02','CH-07','CH-10','CH-12']],
    ['资源',['CH-04','CH-03','CH-11']]
  ]}
};

const DESIGN_LINKS=[
  ['IE-31','HT-31','SC-01','CH-05'],
  ['IE-18','HT-01','SC-05','CH-01'],
  ['IE-12','HT-20','SC-06','CH-12'],
  ['IE-04','HT-10','SC-07','CH-03'],
  ['IE-25','HT-33','SC-10','CH-08'],
  ['IE-02','HT-12','SC-07','CH-04'],
  ['IE-24','HT-29','SC-09','CH-06']
];
