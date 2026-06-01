export async function checkAvailability() {
  return { available: true };
}

export async function reserveSoftStock() {
  return { reserved: true };
}

export default {
  checkAvailability,
  reserveSoftStock,
};
