const { Builder, By, until } = require('selenium-webdriver')
const fs = require('fs').promises

let attempts = 0
let totalNumItems = 0

setInterval(() => {
   console.log('Restarting browser after 2 mins...')
}, 3600000) // Every 30 mins 1800000 600000 === 10 mins

let currentTireTitle = ''

// let restartNeeded = false

// // Periodic restart logic
// setInterval(() => {
//    //console.log('Restarting browser after 5 mins...')
//    restartNeeded = true
// }, 300000) // Every 30 mins 1800000

async function run(makeIn, yearIn, modelIn, sizeIn, tireIn) {
   let driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(new (require('selenium-webdriver/chrome').Options)().addArguments(['--no-sandbox'])) // 🚀 FIX: Disable Chrome sandbox
      .build()

   await driver.manage().window().setRect({ x: -1090, y: 0, width: 1100, height: 1920 })

   // const memUsage = setInterval(() => {
   //    const memUsage = process.memoryUsage()
   //    console.log(`Memory Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`)
   // }, 30000)
   // const cpuUsage = setInterval(() => {
   //    const usage = process.cpuUsage()
   //    console.log(`CPU Time: ${usage.user / 1000000} ms`)
   // }, 60000)

   let restartNeeded = false

   // Periodic restart logic
   const intervalID = setInterval(() => {
      console.log('Restarting browser after 2 mins...')
      restartNeeded = true
   }, 600000) // Every 30 mins 1800000 600000 === 10 mins

   let makeIndex = makeIn
   let yearIndex = yearIn
   let modelIndex = modelIn
   let sizeIndex = sizeIn
   let tireIndex = tireIn

   try {
      // ✅ Navigate to the correct page
      await driver.get('https://www.claydooley.com/shop-for-tires/')
      await driver.sleep(10000) // 🛑 Pause to observe the page load

      // ✅ Wait for the dropdown to appear
      await driver.wait(until.elementLocated(By.id('ddlMake')), 1000)

      let makeOptions = await getDropdownOptions(driver, 'ddlMake')

      for (let i = makeIn; i < makeIn + 1; i++) {
         console.log('i: ', i)
         console.log('makeIndex + 1: ', makeIn + 1)
         // for (let i = makeIndex; i < makeIndex+1; i++) { for (let i = makeIndex; i < makeOptions.length; i++) {
         const make = makeOptions[i].text

         await selectDropdown(driver, 'ddlMake', make)

         // ✅ Ensure Year dropdown updates
         await driver.wait(until.elementLocated(By.id('ddlYears')), 1000)
         let yearOptions = await getDropdownOptions(driver, 'ddlYears')

         for (let i = yearIndex; i < yearOptions.length; i++) {
            const year = yearOptions[i].text
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

               for (let i = sizeIndex; i < sizeOptions.length; i++) {
                  const size = sizeOptions[i].text
                  await selectDropdown(driver, 'ddlOptions', size)

                  // ✅ Click the search button
                  let findMyTiresBtn = await driver.findElement(By.id('btnSearch'))
                  await slowClick(findMyTiresBtn, driver, 1000)

                  // ✅ Check and click dealer button if it appears
                  let dealerClicked = await checkAndClickDealerButton(driver)
                  if (dealerClicked) {
                     console.log('Clicked the first dealer select button.')
                     await driver.sleep(3000)
                  }

                  let tireElements = await driver.findElements(By.xpath("//*[contains(@id, 'additionalTire')]"))

                  if (tireElements.length === 0) {
                     const tireData = {
                        make: make,
                        year: year,
                        model: model,
                        size: size,
                        tireTitle: 'None Found',
                        basePrice: 'None Found',
                        installPrice: 'None Found',
                        quote: 'None Found',
                        features: 'None Found',
                        benefits: 'None Found',
                        specs: 'None Found',
                     }

                     await appendJsonToFile(tireData)

                     let modalCloseBtn = await driver.findElement(By.id('modalClose'))
                     await slowClick(modalCloseBtn, driver)
                  } else {
                     for (let i = tireIndex; i < tireElements.length; i++) {
                        let updatedTireElements = await driver.findElements(
                           By.xpath("//*[contains(@id, 'additionalTire')]")
                        )
                        //  try {
                        let tireLink = await updatedTireElements[i].findElement(By.xpath('.//div/div[5]/div[2]/div/a'))
                        await slowClick(tireLink, driver) // Click that causes navigation

                        let [tireTitle, priceData, featuresList, benefitsList, specsList] = await Promise.all([
                           getTireTitle(driver),
                           getPricingData(driver),
                           getFeaturesList(driver),
                           getBenefitsList(driver),
                           getSpecData(driver),
                        ])

                        currentTireTitle = tireTitle

                        const tireData = {
                           make: make,
                           year: year,
                           model: model,
                           size: size,
                           tireTitle: tireTitle,
                           basePrice: priceData.displayPrice,
                           installPrice: priceData.installTotal,
                           quote: priceData.quote,
                           features: featuresList,
                           benefits: benefitsList,
                           specs: specsList,
                        }

                        await appendJsonToFile(tireData)

                        tireIndex += 1
                        totalNumItems += 1

                        let returnButton = await driver.wait(
                           until.elementLocated(By.xpath("//a[contains(text(), 'Return To Search Results')]")),
                           5000
                        )

                        await slowClick(returnButton, driver)
                     }
                  }
                  tireIndex = 0
                  sizeIndex += 1
                  // ✅ Navigate back for the next iteration --> THIS WORKS!!
                  let backToSearchBtn = await driver.findElement(By.id('searchBackLink'))
                  await slowClick(backToSearchBtn, driver)
               }
               sizeIndex = 0
               modelIndex += 1

               // break from the entire function here
               if (restartNeeded) {
                  throw new Error('Restart triggered due to timeout.')
               } else {
                  console.log('restart not needed')
               }
            }
            modelIndex = 0
            yearIndex += 1
         }
         yearIndex = 0
         makeIndex += 1
      }

      clearInterval(intervalID)
      await driver.quit()

      console.log('YOU MADE IT THROUGH ALL OF THEM!')
   } catch (error) {
      console.log('SOMETHING WENT WRONG: ', error)

      attempts += 1

      const tireData = {
         error: 'Something went wrong',
         currentTireTitle: currentTireTitle,
         makeIndex: makeIndex,
         yearIndex: yearIndex,
         modelIndex: modelIndex,
         sizeIndex: sizeIndex,
         tireIndex: tireIndex,
      }

      await appendJsonToFile(tireData)
      clearInterval(intervalID)
      await driver.quit()

      if (restartNeeded) {
         attempts = 0
         restartNeeded = false
      }

      if (attempts < 5) {
         // clearInterval(memUsage)
         // clearInterval(cpuUsage)
         await run(makeIndex, yearIndex, modelIndex, sizeIndex)
      }
   }
}

// let parentHTML = await driver.executeScript('return arguments[0].outerHTML;', specsParentElement)
// await fs.writeFile('elem.html', parentHTML, 'utf8')
async function selectDropdown(driver, dropdownId, optionToSelect) {
   let dropdown = await driver.findElement(By.id(dropdownId))
   await slowClick(dropdown, driver)
   await driver.wait(until.elementLocated(By.css(`option[value="${optionToSelect}"]`)), 3000)
   let option = await driver.findElement(By.css(`option[value="${optionToSelect}"]`))
   await slowClick(option, driver)
}

async function getTireTitle(driver) {
   let tireTitleElement = await driver.findElement(By.css('.ta-heading-text.ng-binding'))
   let tireTitleText = await tireTitleElement.getText()
   return tireTitleText
}

async function getPricingData(driver) {
   let displayPrice = ''

   let priceSpans = await driver.findElements(By.xpath("//span[contains(@class, 'ta-display-price')]"))

   for (let span of priceSpans) {
      let className = await span.getAttribute('class')
      let priceText = await span.getText()

      if (!className.includes('ng-hide') && priceText.trim() !== '' && priceText.trim() !== '0') {
         displayPrice = parseFloat(priceText.replace(/[^0-9.]/g, ''))
         break
      }
   }

   let installPriceP = await driver.findElement(By.css('p.right.ng-binding'))
   let installPriceText = await installPriceP.getText()
   let installTotal = parseFloat(
      installPriceText.slice(0, installPriceText.indexOf('(')).replace('Installation Price: $', '')
   )

   const fullQuote = displayPrice + installTotal

   return { displayPrice, installTotal, fullQuote }
}

async function getFeaturesList(driver) {
   let featuresListElement = await driver.findElement(By.xpath("//*[text()='Features']"))
   let featureParentElement = await featuresListElement.findElement(By.xpath('..'))

   // Find all <li> elements inside the parent
   let listItems = await featureParentElement.findElements(By.css('li'))

   // Extract and print the text of each <li>
   const featuresList = []
   for (let item of listItems) {
      let text = await item.getText()
      featuresList.push(text)
   }

   return featuresList
}

async function getBenefitsList(driver) {
   let benefitsListElement = await driver.findElement(By.xpath("//*[text()='Benefits']"))
   let benefitsParentElement = await benefitsListElement.findElement(By.xpath('..'))

   // Find all <li> elements inside the parent
   let benefitsListItems = await benefitsParentElement.findElements(By.css('li'))

   // Extract and print the text of each <li>
   const benefitsList = []
   for (let item of benefitsListItems) {
      let text = await item.getText()
      benefitsList.push(text)
   }

   return benefitsList
}

async function getSpecData(driver) {
   let specsListElement = await driver.findElement(By.xpath("//*[text()='Specifications']"))
   let specsParentElement = await specsListElement.findElement(By.xpath('..'))
   let specsListItems = await specsParentElement.findElements(By.css('.col-xs-6.ng-binding'))

   // Extract and print the text of each <li>
   const specsList = []
   for (let item of specsListItems) {
      let text = await item.getText()
      specsList.push(text)
   }

   return specsList
}

// ✅ Slow Click Helper Function (Customizable Delay)
async function slowClick(element, driver, delay = 300) {
   try {
      await driver.wait(until.elementIsVisible(element), 2000)
      await element.click()
   } catch (err) {
      console.error('Error clicking element:', err)
   }
}

// ✅ Check and Click First Available Dealer Button
async function checkAndClickDealerButton(driver) {
   try {
      await driver.wait(until.elementLocated(By.css('a.btn.btn-default.blue')), 2000)

      let buttons = await driver.findElements(By.css('a.btn.btn-default.blue'))
      if (buttons.length > 0) {
         await slowClick(buttons[0], driver)
         return true
      }
   } catch (error) {
      console.log('No clickable dealer button found.')
   }
   return false
}

// ✅ Improved Dropdown Option Fetching
async function getDropdownOptions(driver, selectID) {
   try {
      let dropdown = await driver.findElement(By.id(selectID))
      await driver.sleep(1000)

      let options = await dropdown.findElements(By.css('option'))
      await driver.sleep(1000)

      let values = []
      for (let option of options) {
         let value = await option.getAttribute('value')
         let text = await option.getText()
         if (value) values.push({ value, text }) // Skip empty values
      }

      return values
   } catch (error) {
      console.error(`Error fetching options from ${selectID}:`, error)
      return []
   }
}

// Function to append JSON data to a file
async function appendJsonToFile(newData) {
   const filePath = './parrallel_tire_data.json'
   try {
      await fs.appendFile(filePath, JSON.stringify(newData) + ',\n', 'utf8')
   } catch (error) {
      console.error('Error appending JSON data:', error)
   }
}

// async function appendJsonToFile(newData) {
//    const filePath = './tire_data.json'
//    try {
//       let existingData = []

//       // Check if file exists and read the existing data
//       try {
//          const fileContent = await fs.readFile(filePath, 'utf8')
//          existingData = JSON.parse(fileContent)
//       } catch (error) {
//          if (error.code !== 'ENOENT') throw error // Ignore "file not found" errors
//       }

//       // Ensure existingData is an array (or use an object if required)
//       if (!Array.isArray(existingData)) {
//          existingData = [existingData] // Convert non-array JSON to an array
//       }

//       // Append the new data
//       existingData.push(newData)

//       // Write back the updated JSON to the file
//       await fs.writeFile(filePath, JSON.stringify(existingData, null, 2), 'utf8')
//    } catch (error) {
//       console.error('Error appending JSON data:', error)
//    }
// }

//run()

const carBrands = [
   'Acura',
   'Alfa Romeo',
   'AM General',
   'American Motors',
   'Aston Martin',
   'Audi',
   'Avanti',
   'Bentley',
   'Bertone',
   'BMW',
   'Buick',
   'Cadillac',
   'Checker',
   'Chevrolet',
   'Chrysler',
   'Coda',
   'Daewoo',
   'Daihatsu',
   'DeLorean',
   'Dodge',
   'Eagle',
   'Ferrari',
   'Fiat',
   'Fisker',
   'Ford',
   'Freightliner',
   'Genesis',
   'Geo',
   'GMC',
   'Honda',
   'Hummer',
   'Hyundai',
   'INEOS',
   'Infiniti',
   'International',
   'Isuzu',
   'Jaguar',
   'Jeep',
   'Karma',
   'Kia',
   'Lamborghini',
   'Lancia',
   'Land Rover',
   'Lexus',
   'Lincoln',
   'Lordstown Motors',
   'Lotus',
   'Lucid',
   'Maserati',
   'Maybach',
   'Mazda',
   'McLaren',
   'Mercedes-Benz',
   'Mercury',
   'Merkur',
   'MG',
   'Mini',
   'Mitsubishi',
   'Mobility Ventures',
   'Nissan',
   'Oldsmobile',
   'Panoz',
   'Peugeot',
   'Pininfarina',
   'Plymouth',
   'Polestar',
   'Pontiac',
   'Porsche',
   'RAM',
   'Renault',
   'Rivian',
   'Rolls-Royce',
   'Saab',
   'Saleen',
   'Saturn',
   'Scion',
   'Smart',
   'SRT',
   'Sterling',
   'Subaru',
   'Suzuki',
   'Tesla',
   'Toyota',
   'Triumph',
   'VinFast',
   'Volkswagen',
   'Volvo',
   'VPG',
   'Yugo',
]

const startTime = Date.now()
async function parallelRun() {
   const urls = [
      'https://example.com/page1',
      'https://example.com/page2',
      'https://example.com/page3',
      'https://example.com/page4',
   ]

   let botStartPoint = 0 // Audi

   const maxConcurrentBots = 4 // Maximum bots running at the same time
   const totalRuns = 88 // Total number of bots that should run
   let completedRuns = 0 // Keep track of finished bots
   const runningBots = [] // Track running bot promises

   console.log('car brands count: ', carBrands.length)

   const bots = []
   for (let index = 1; index <= maxConcurrentBots; index++) {
      bots.push(index)
   }

   // async function run(botId) {
   //    console.log(`Bot ${botId} started.`)

   //    // Simulate Selenium bot execution (Replace with actual bot logic)
   //    await new Promise((resolve) => setTimeout(resolve, Math.random() * 5000 + 1000)) // Simulate delay (1-6 sec)

   //    console.log(`Bot ${botId} finished.`)
   //    return botId
   // }

   // Give bots IDs then push the promise to running bots. On catch of bot return the index of where bot failed and then run new bot in place of old bot in runningBots

   while (completedRuns < totalRuns) {
      // Start new bots if there's capacity and we haven't reached the limit
      while (runningBots.length < maxConcurrentBots && completedRuns + runningBots.length < totalRuns) {
         let botId = completedRuns + runningBots.length + 1
         let botPromise = run(botStartPoint, 0, 0, 0, 0).then(() => {
            runningBots.splice(runningBots.indexOf(botPromise), 1) // Remove finished bot from tracking
            completedRuns++ // Increase completed count
         })

         runningBots.push(botPromise)

         botStartPoint += 1
      }

      // Wait for any one bot to finish before launching new ones
      try {
         const result = await Promise.race(runningBots)
         console.log('First bot result:', result)
      } catch (error) {
         console.error('First bot error:', error)
      }
   }
   const endTime = Date.now()
   const executionTime = endTime - startTime
   console.log('Execution Time: ', executionTime / 1000)

   console.log('Scraping completed!')
}

parallelRun()
