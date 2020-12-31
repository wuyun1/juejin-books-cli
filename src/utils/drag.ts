import { delay } from "./common";


let btn_position: any = null
let times = 0 // 执行重新滑动的次数
const distanceError = [-10, 2, 3, 5] // 距离误差

/**
 * 计算按钮需要滑动的距离 
 * */
async function calculateDistance(page: any) {
    const distance = await page.evaluate(() => {

        // 比较像素,找到缺口的大概位置
        function compare(document: any) {
            const ctx1 = document.querySelector('#captcha-verify-image'); // 完成图片
            const ctx2 = document.querySelector('.captcha_verify_img_slide');  // 带缺口图片
            const pixelDifference = 30; // 像素差
            let res: any[] = []; // 保存像素差较大的x坐标

            // 对比像素
            for (let i = 57; i < 260; i++) {
                for (let j = 1; j < 160; j++) {
                    const imgData1 = ctx1.getContext("2d").getImageData(1 * i, 1 * j, 1, 1)
                    const imgData2 = ctx2.getContext("2d").getImageData(1 * i, 1 * j, 1, 1)
                    const data1 = imgData1.data;
                    const data2 = imgData2.data;
                    const res1 = Math.abs(data1[0] - data2[0]);
                    const res2 = Math.abs(data1[1] - data2[1]);
                    const res3 = Math.abs(data1[2] - data2[2]);
                    if (!(res1 < pixelDifference && res2 < pixelDifference && res3 < pixelDifference)) {
                        if (!res.includes(i)) {
                            res.push(i);
                        }
                    }
                }
            }
            // 返回像素差最大值跟最小值，经过调试最小值往左小7像素，最大值往左54像素
            return { min: res[0] - 7, max: res[res.length - 1] - 54 }
        }
        return compare(document)
    })
    return distance;
}

/**
 * 计算滑块位置
*/
async function getBtnPosition(page: any) {
    const btn_position = await page.evaluate(() => {
        const { clientWidth, clientHeight } = document.querySelector('.secsdk-captcha-drag-icon') as any
        return { btn_left: clientWidth / 2 - 104, btn_top: clientHeight / 2 + 59 }
    })
    return btn_position;
}

/**
 * 尝试滑动按钮
 * @param distance 滑动距离
 * */
async function tryValidation({ page, distance }: any) {
    //将距离拆分成两段，模拟正常人的行为
    const distance1 = distance - 10
    const distance2 = 10

    page.mouse.click(btn_position.btn_left, btn_position.btn_top, { delay: 2000 })
    page.mouse.down(btn_position.btn_left, btn_position.btn_top)
    page.mouse.move(btn_position.btn_left + distance1, btn_position.btn_top, { steps: 30 })
    await delay(800);
    page.mouse.move(btn_position.btn_left + distance1 + distance2, btn_position.btn_top, { steps: 20 })
    await delay(800);
    page.mouse.up()
    await delay(4000);

    // 判断是否验证成功
    const isSuccess = await page.evaluate(() => {
        return document.querySelector('.captcha_verify_img--wrapper .msg') && document.querySelector('.captcha_verify_img--wrapper .msg')!.innerHTML
    })
    await delay(1000);
    // // 判断是否需要重新计算距离
    // const reDistance = await page.evaluate(() => {
    //     return document.querySelector('.geetest_result_content') && document.querySelector('.geetest_result_content')!.innerHTML
    // })
    await delay(1000);
    return { isSuccess: isSuccess === '验证通过', reDistance: false }
}

/**
 * 拖动滑块
 * @param distance 滑动距离
 * */
export async function drag({ page, distance }: any) {

    if(btn_position === null) {
        btn_position = await getBtnPosition(page);
    }

    distance = distance || await calculateDistance(page);
    const result = await tryValidation({ page, distance: distance.min })
    if (result.isSuccess) {
        await delay(1000);
        //登录
        console.log('验证成功')
        // page.click('#modal-member-login button')
    } else if (result.reDistance) {
        console.log('重新计算滑距离录，重新滑动')
        times = 0
        await drag({ page, distance: null })
    } else {
        if (distanceError[times]) {
            times++
            console.log('重新滑动')
            await drag(
                { page, distance: { min: distance.max, max: distance.max + distanceError[times] } }
            )
        } else {
            console.log('滑动失败')
            times = 0
            throw new Error('滑动失败');
        }
    }
}
