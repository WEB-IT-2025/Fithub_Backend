import { petModel } from '~/models/petModel'
import { thresholdModel } from '~/models/thresholdModel'
import { dataSyncService } from '~/services/dataSyncService'

/**
 * ペットの成長計算サービス
 */
export const petGrowthService = {
    /**
     * 購入日とメインペット育成期間に基づいて親密度を計算 (0-100%)
     * - メインペット: 30日で100%到達
     * - サブペット: 親密度は0%で固定（成長しない）
     */
    async calculateIntimacyFromPurchaseAndCare(userId: string, itemId: string): Promise<number> {
        try {
            // メインペットかどうかを確認
            const isMainPet = await petModel.isMainPet(userId, itemId)

            // サブペットの場合は親密度0%で固定
            if (!isMainPet) {
                console.log(`Pet ${itemId} for user ${userId} is not main pet, intimacy stays at 0%`)
                return 0
            }

            // メインペットの場合のみ親密度計算
            const purchaseDate = await petModel.getPetPurchaseDate(userId, itemId)
            if (!purchaseDate) {
                console.log(`No purchase date found for user ${userId}, pet ${itemId}`)
                return 0
            }

            // 購入からの経過日数を計算
            const now = new Date()
            const daysSincePurchase = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24))

            // メインペットの親密度計算（30日で100%到達）
            const maxDaysForMaxIntimacy = 30 // 30日で最大親密度に到達
            let intimacyPercentage = Math.min(100, (daysSincePurchase / maxDaysForMaxIntimacy) * 100)

            // 最小0%、整数に丸める
            intimacyPercentage = Math.max(0, Math.round(intimacyPercentage))

            console.log(
                `Main pet intimacy calculation for user ${userId}, pet ${itemId}: ` +
                    `${daysSincePurchase} days since purchase, ` +
                    `intimacy: ${intimacyPercentage}%`
            )

            return intimacyPercentage
        } catch (error) {
            console.error('Error calculating intimacy from purchase and care:', error)
            return 0
        }
    },

    /**
     * 1週間の合計歩数に基づいて親密度を計算 (0-100%)
     * エンジニアの1週間平均歩数: 約35,000歩（5,000歩/日 × 7日）を基準とする
     * さらに将来的にはペットとの相互作用回数（給餌、遊び等）も含めて計算
     */
    async calculateIntimacyFromSteps(userId: string): Promise<number> {
        try {
            // 過去7日間の歩数データを取得
            const stepsData = await dataSyncService.getWeeklyStepsFromDatabase(userId)

            if (stepsData.length === 0) {
                return 0 // データがない場合は0%
            }

            // 過去7日間の合計歩数を計算
            const totalWeeklySteps = stepsData.reduce((sum, data) => sum + data.steps, 0)

            // 親密度基準値を取得（デフォルト: 35000歩/週）
            // pet_health_logic = エンジニアの1週間平均歩数を親密度計算に使用
            const thresholds = await thresholdModel.getAllThresholds()
            const intimacyStandard = thresholds?.pet_health_logic || 35000

            // 基本親密度を計算 (歩数ベース: 0-80%)
            // 80%上限にして、残り20%は将来的にペットとの相互作用で獲得
            let baseIntimacyPercentage = Math.round((totalWeeklySteps / intimacyStandard) * 80)

            // 最大80%、最小0%に制限（歩数分）
            baseIntimacyPercentage = Math.max(0, Math.min(80, baseIntimacyPercentage))

            // 将来の拡張: ペットとの相互作用ボーナス（現在は0）
            const interactionBonus = 0 // TODO: 給餌、遊び、お手入れ等の相互作用回数から計算

            const finalIntimacy = baseIntimacyPercentage + interactionBonus

            console.log(
                `Intimacy calculation for user ${userId}: ${totalWeeklySteps} steps / ${intimacyStandard} standard = ${baseIntimacyPercentage}% (base) + ${interactionBonus}% (interactions) = ${finalIntimacy}%`
            )
            return finalIntimacy
        } catch (error) {
            console.error('Error calculating intimacy from steps:', error)
            return 0
        }
    } /**
     * 週間コントリビューション数に基づいてペットサイズを計算 (0-100%)
     * 例: 週50回のコントリビューションで100%
     */,
    async calculateSizeFromContributions(userId: string): Promise<number> {
        try {
            // 過去7日間のコントリビューション数を取得
            const contribData = await dataSyncService.getWeeklyContributionsFromDatabase(userId)

            if (contribData.length === 0) {
                console.log(`🔍 [DEBUG] No contribution data found for user ${userId}, returning 0%`)
                return 0 // データがない場合は0%
            }

            // 過去7日間の合計コントリビューション数を計算
            const totalContributions = contribData.reduce((sum, data) => sum + data.contributions, 0)

            // サイズ基準値を取得（デフォルト: 100回/週）- 修正済み
            const thresholds = await thresholdModel.getAllThresholds()
            const sizeStandard = thresholds?.pet_size_logic || 100

            console.log(`🔍 [DEBUG] Threshold data for ${userId}:`, thresholds)
            console.log(`🔍 [DEBUG] Size standard being used: ${sizeStandard}`)

            // サイズを計算 (0-100%)
            // sizeStandard回で100%、0回で0%の線形計算
            let sizePercentage = Math.round((totalContributions / sizeStandard) * 100)

            // 最大100%、最小0%に制限
            sizePercentage = Math.max(0, Math.min(100, sizePercentage))

            console.log(
                `🔍 [DEBUG] Size calculation for user ${userId}: ` +
                    `${totalContributions} contributions / ${sizeStandard} standard = ${sizePercentage}% ` +
                    `(raw: ${((totalContributions / sizeStandard) * 100).toFixed(2)}%)`
            )
            console.log(`🔍 [DEBUG] Contribution data for ${userId}:`, contribData)
            return sizePercentage
        } catch (error) {
            console.error('Error calculating size from contributions:', error)
            return 0
        }
    },

    /**
     * 個別ペットのサイズを計算 (0-100%)
     * 基本はコントリビューション数ベースだが、ペット毎の特性や育成期間も考慮
     */
    async calculateSizeForIndividualPet(userId: string, itemId: string): Promise<number> {
        try {
            // 基本サイズ（コントリビューション数ベース）
            const baseSize = await this.calculateSizeFromContributions(userId)

            // ペット個別の育成ボーナス（購入からの経過時間）
            const purchaseDate = await petModel.getPetPurchaseDate(userId, itemId)
            let timeBonus = 0

            if (purchaseDate) {
                const now = new Date()
                const daysSincePurchase = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24))

                // 30日かけて最大10%のボーナス
                timeBonus = Math.min(10, (daysSincePurchase / 30) * 10)
            }

            // メインペットの場合は追加ボーナス
            const isMainPet = await petModel.isMainPet(userId, itemId)
            const mainPetBonus = isMainPet ? 5 : 0

            // 最終サイズ計算
            let finalSize = Math.round(baseSize + timeBonus + mainPetBonus)
            finalSize = Math.max(0, Math.min(100, finalSize))

            console.log(
                `🔍 [DEBUG] Individual pet size calculation for user ${userId}, pet ${itemId}: ` +
                    `base=${baseSize}%, timeBonus=${timeBonus.toFixed(1)}%, mainBonus=${mainPetBonus}%, final=${finalSize}%`
            )

            // 追加デバッグ情報
            if (finalSize >= 100) {
                console.log(`🚨 [DEBUG] Pet size reached maximum (100%) for ${userId}:${itemId}`)
                console.log(`   - Base size from contributions: ${baseSize}%`)
                console.log(`   - Time bonus (purchase date): ${timeBonus.toFixed(1)}%`)
                console.log(`   - Main pet bonus: ${mainPetBonus}%`)
                console.log(`   - Total before cap: ${(baseSize + timeBonus + mainPetBonus).toFixed(1)}%`)
            }

            return finalSize
        } catch (error) {
            console.error('Error calculating individual pet size:', error)
            return 0
        }
    },

    /**
     * 健康度を歩数から計算 (0-100%)
     * 全ペット共通の値として使用
     */
    async calculateHealthFromSteps(userId: string): Promise<number> {
        try {
            // 過去7日間の歩数データを取得
            const stepsData = await dataSyncService.getWeeklyStepsFromDatabase(userId)

            if (stepsData.length === 0) {
                return 50 // データがない場合は標準的な健康度
            }

            // 過去7日間の合計歩数を計算
            const totalWeeklySteps = stepsData.reduce((sum, data) => sum + data.steps, 0)

            // 健康度基準値を取得（デフォルト: 35000歩/週）
            const thresholds = await thresholdModel.getAllThresholds()
            const healthStandard = thresholds?.pet_health_logic || 35000

            // 健康度を計算 (0-100%)
            let healthPercentage = Math.round((totalWeeklySteps / healthStandard) * 100)

            // 最大100%、最小0%に制限
            healthPercentage = Math.max(0, Math.min(100, healthPercentage))

            console.log(
                `Health calculation for user ${userId}: ` +
                    `${totalWeeklySteps} steps, standard=${healthStandard}, health=${healthPercentage}%`
            )

            return healthPercentage
        } catch (error) {
            console.error('Error calculating health from steps:', error)
            return 50 // エラー時は標準値
        }
    },

    /**
     * メインペット切り替え時に健康度を引き継ぐ
     * 新しいメインペットが前のメインペットの健康度を引き継ぐ
     */
    async transferHealthOnMainPetSwitch(userId: string, newMainPetItemId: string): Promise<boolean> {
        try {
            // 現在のメインペットの健康度計算
            const currentHealthPercentage = await this.calculateHealthFromSteps(userId)

            console.log(
                `Health inheritance for user ${userId}: ` +
                    `new main pet ${newMainPetItemId} inherits health=${currentHealthPercentage}%`
            )

            // 健康度は歩数ベースで全ペット共通なので、
            // 実際にはDBに保存せずに動的計算で一致するが、
            // ログとして記録し、将来的な拡張に備える

            return true
        } catch (error) {
            console.error('Error transferring health on main pet switch:', error)
            return false
        }
    },

    /**
     * ユーザーのペットのサイズと親密度を更新
     * メインペットのみサイズと親密度を更新、サブペットは健康度のみ（引き継がない）
     */
    async updatePetGrowthForUser(userId: string): Promise<boolean> {
        try {
            // 現在のペットデータを取得
            const userPets = await petModel.getUserOwnedPets(userId)

            if (userPets.length === 0) {
                console.log(`No pets found for user: ${userId}`)
                return true // ペットがない場合は正常終了
            }

            // 健康度を計算（全ペット共通、歩数ベース）
            const healthPercentage = await this.calculateHealthFromSteps(userId)

            // メインペットのみサイズと親密度を更新
            for (const pet of userPets) {
                if (pet.user_main_pet) {
                    // メインペットの場合：サイズと親密度を個別計算・更新
                    const newSize = await this.calculateSizeForIndividualPet(userId, pet.item_id)
                    const newIntimacy = await this.calculateIntimacyFromPurchaseAndCare(userId, pet.item_id)

                    // ペットデータを更新
                    await petModel.updatePetGrowthData(userId, pet.item_id, newSize, newIntimacy)

                    console.log(
                        `Updated MAIN pet ${pet.item_id} for user ${userId}: ` +
                            `size=${newSize}%, intimacy=${newIntimacy}%, ` +
                            `health=${healthPercentage}%`
                    )
                } else {
                    // サブペットの場合：健康度以外は引き継がない（更新しない）
                    console.log(
                        `Skipped SUB pet ${pet.item_id} for user ${userId}: ` +
                            `size/intimacy not inherited, health=${healthPercentage}%`
                    )
                }
            }

            return true
        } catch (error) {
            console.error('Error updating pet growth for user:', userId, error)
            return false
        }
    },

    /**
     * 全ユーザーのペット成長データを更新（バッチ処理用）
     */
    async updateAllUsersPetGrowth(): Promise<void> {
        try {
            // 全ユーザーのリストを取得
            const users = await petModel.getAllUsersWithPets()

            console.log(`Starting pet growth update for ${users.length} users`)

            for (const user of users) {
                await this.updatePetGrowthForUser(user.user_id)
            }

            console.log('Pet growth update completed for all users')
        } catch (error) {
            console.error('Error updating pet growth for all users:', error)
            throw error
        }
    },
}
