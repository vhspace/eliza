export function getSecret(character: Character, secret: string) {
	return character.settings?.secrets?.[secret] || process.env[secret]
}