// import Home from "@/view/Home.vue";
import Home from "@/view/Home_Spark.vue";

const routes = [
    {
        path: '/',
        alias: '/home',
        name: 'Home',
        component: Home,    // 首页不启用lazyLoad
        meta: {
            verifyAPIConfig: true,      // 校验API配置 ( 非必要, 默认false )
            title: 'ChatFrontend'   // 页面标题 ( 非必要 )
        }
    },
    // {
    //     path: '/developer',
    //     name: 'TEST',
    //     component: () => import('@/view/Developer.vue'),
    // },
    // {
    //     path: '/home_Spark',
    //     name: 'Home_Spark',
    //     component: () => import('@/view/Home_Spark.vue'),
    //     meta: {
    //         title: 'ChatFrontend'   // 页面标题 ( 非必要 )
    //     }
    // },
    // {
    //     path: '/config',
    //     name: 'Config',
    //     component: () => import('@/view/Config.vue'),
    //     meta: {
    //         title: 'Config'
    //     }
    // },
    {
        // 配置全局匹配，跳转到 /
        path: '/:pathMatch(.*)*',
        redirect: '/'
    }
];

export default routes