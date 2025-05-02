import { Builder, By, until } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'
import {
   carBrands,
   checkAndClickDealerButton,
   selectDropdown,
   getDropdownOptions,
   getPricingData,
   getFeaturesList,
   getBenefitsList,
   getSpecData,
   getTireTitle,
   slowClick,
   appendJsonToFile,
   getMakeYears,
} from './get-data-functions.js'

async function makeTireTotal(makeIn) {
   let driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(new chrome.Options().addArguments(['--no-sandbox'])) // 🚀 FIX: Disable Chrome sandbox
      .build()

   await driver.manage().window().setRect({ x: -1090, y: 0, width: 1100, height: 1920 })

   let restartNeeded = false

   // Periodic restart logic
   const intervalID = setInterval(() => {
      restartNeeded = true
   }, 180000) // Every 30 mins 1800000 600000 === 10 mins

   let makeIndex = makeIn
   let yearIndex = 0
   let modelIndex = 0
   let sizeIndex = 0

   let makeTireTotal = 0

   try {
      // ✅ Navigate to the correct page
      await driver.get('https://www.claydooley.com/shop-for-tires/')
      await driver.sleep(10000) // 🛑 Pause to observe the page load

      // ✅ Wait for the dropdown to appear
      await driver.wait(until.elementLocated(By.id('ddlMake')), 1000)
      let makeOptions = await getDropdownOptions(driver, 'ddlMake')
      const make = makeOptions[makeIndex].text

      await selectDropdown(driver, 'ddlMake', make)

      // ✅ Ensure Year dropdown updates
      await driver.wait(until.elementLocated(By.id('ddlYears')), 1000)
      let yearOptions = await getDropdownOptions(driver, 'ddlYears')

      for (let i = yearIndex; i < yearOptions.length; i++) {
         const year = yearOptions[i].text
         console.log('Began Scrapping Year: ', year)
         await selectDropdown(driver, 'ddlYears', year)

         // ✅ Ensure Model dropdown updates
         await driver.wait(until.elementLocated(By.id('ddlModels')), 1000)
         let modelOptions = await getDropdownOptions(driver, 'ddlModels')

         for (let i = modelIndex; i < modelOptions.length; i++) {
            const model = modelOptions[i].text
            await selectDropdown(driver, 'ddlModels', model)

            // ✅ Ensure Options dropdown updates
            await driver.wait(until.elementLocated(By.id('ddlOptions')), 1000)
            let sizeOptions = await getDropdownOptions(driver, 'ddlOptions')
            let skipBackToSearch = false

            for (let i = sizeIndex; i < sizeOptions.length; i++) {
               const size = sizeOptions[i].text
               await selectDropdown(driver, 'ddlOptions', size)

               // ✅ Click the search button
               let findMyTiresBtn = await driver.findElement(By.id('btnSearch'))
               //console.log('slowClicking FIND MY TIRES BTN')
               await slowClick(findMyTiresBtn, driver, 1000)

               // ✅ Check and click dealer button if it appears
               let dealerClicked = await checkAndClickDealerButton(driver)
               if (dealerClicked) {
                  await driver.sleep(3000)
               }

               let tireElements = await driver.findElements(By.xpath("//*[contains(@id, 'additionalTire')]"))

               if (tireElements.length === 0) {
                  let modalCloseBtn = await driver.findElement(By.css('.close-btn.pull-right.blue'))
                  await slowClick(modalCloseBtn, driver)
                  skipBackToSearch = true
               } else {
                  makeTireTotal += tireElements.length
               }

               sizeIndex += 1
               // ✅ Navigate back for the next iteration --> THIS WORKS!!
               if (!skipBackToSearch) {
                  // this is needed because await slowClick(modalCloseBtn, driver)
                  let backToSearchBtn = await driver.findElement(By.id('searchBackLink'))
                  await slowClick(backToSearchBtn, driver)
               }
               skipBackToSearch = false
            }
            sizeIndex = 0
            modelIndex += 1
         }
         modelIndex = 0
         yearIndex += 1
      }

      await driver.quit()

      console.log(`Finished!!! ${makeTireTotal}`)
   } catch (err) {
      console.log('something went wrong')
      await driver.quit()
   }
}

const make = 'Acura'

makeTireTotal(carBrands.indexOf(make))
