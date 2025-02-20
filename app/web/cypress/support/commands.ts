// @ts-check
///<reference path="../global.d.ts"/>

// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// Import commands for auth0 auth providers
import "./auth-provider-commands/auth0";

Cypress.Commands.add("getBySel", (selector, ...args) => {
  return cy.get(`[data-test=${selector}]`, ...args)
})
Cypress.Commands.add("getBySelLike", (selector, ...args) => {
  return cy.get(`[data-test*=${selector}]`, ...args)
})

// Define the custom Cypress command in your Cypress support/commands.ts file
// commands.ts
Cypress.Commands.add('dragTo', (sourceElement: string, targetElement: string) => {
  cy.get(sourceElement).then(() => {
    cy.get(targetElement).then(($targetElement) => {
      const targetOffset = $targetElement.offset();
      const targetWidth = $targetElement.width();
      const targetHeight = $targetElement.height();

      // Calculate the coordinates to move to the center of the target element
      const clientX = targetOffset.left + targetWidth / 2;
      const clientY = targetOffset.top + targetHeight / 2;

      // Trigger a drag and drop action
      cy.get(sourceElement)
        .trigger('mousedown', { button: 0 }) // Simulate mouse down event
        .trigger('mousemove', { clientX: clientX, clientY: clientY }) // Move the object to a new position
        .trigger('mouseup') // Simulate mouse up event
    })
  })
});




